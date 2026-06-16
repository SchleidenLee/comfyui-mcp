import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorkflowJSON } from "../comfyui/types.js";
import { modifyWorkflow, type ModifyOperation } from "../services/workflow-composer.js";
import {
  selectTemplate,
  getSessionWorkflow,
  updateSessionWorkflow,
  getTemplateIds,
} from "../services/template-manager.js";
import { getObjectInfo } from "../comfyui/client.js";
import { errorToToolResult, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// 操作 Schema - 使用 z.any() 避免 discriminatedUnion 导致的 Agent 序列化问题
// MCP SDK 将复杂 Zod schema 转为 JSON Schema 后，LLM 在生成嵌套数组时
// 容易错误地将 array 序列化为 string，导致 -32602 校验失败。
// 改为宽松 schema + handler 内手动校验。
// ============================================================================

const operationSchema = z.object({
  op: z.string().describe("Operation type: set_param, set_input, add_node, remove_node, connect, or disconnect"),
  node_id: z.string().optional().describe("Target node ID (for set_input, remove_node)"),
  input_name: z.string().optional().describe("Input port name (for set_input, connect)"),
  value: z.any().optional().describe("Value to set (for set_input, set_param)"),
  param_name: z.string().optional().describe("Template parameter name (for set_param), e.g. checkpoint, positive_prompt, seed"),
  class_type: z.string().optional().describe("Node class type (for add_node)"),
  inputs: z.record(z.any()).optional().describe("Node input values (for add_node)"),
  id: z.string().optional().describe("Explicit node ID (for add_node)"),
  source_id: z.string().optional().describe("Source node ID (for connect, insert_between)"),
  output_index: z.number().optional().describe("Source output index (for connect, insert_between)"),
  target_id: z.string().optional().describe("Target node ID (for connect, insert_between)"),
  insert_between: z
    .object({
      source_id: z.string(),
      output_index: z.number(),
      target_id: z.string(),
      input_name: z.string(),
    })
    .optional()
    .describe(
      "If provided with add_node, inserts the new node between source and target: " +
        "breaks the existing connection, wires the new node's primary input to source, " +
        "and rewires target's input to the new node's output 0.",
    ),
  // For disconnect operation
  disconnect_target_id: z.string().optional().describe("Target node ID to disconnect (for disconnect)"),
  disconnect_input_name: z.string().optional().describe("Input port name to disconnect (for disconnect)"),
});

// ============================================================================
// 工具注册
// ============================================================================

export function registerWorkflowComposeTools(server: McpServer): void {
  // ==========================================================================
  // create_workflow - 从模板创建 Session（替代旧版，返回 session_id 而非 JSON）
  // ==========================================================================
  server.tool(
    "create_workflow",
    "Create an editable session from a built-in template. Returns a session_id for use with modify_workflow and run_workflow. Use list_templates to see available templates and their parameters. This is an alias for select_template.",
    {
      template_id: z.string().describe("Template ID (use list_templates to see available)"),
      params: z
        .record(z.any())
        .optional()
        .default({})
        .describe(
          "Template parameters to apply. Available keys depend on the template. Common: checkpoint, positive_prompt, negative_prompt, width, height, steps, cfg, seed, sampler_name, scheduler.",
        ),
    },
    async ({ template_id, params }) => {
      try {
        logger.info("Creating workflow session", { template_id, params });

        // 如果模板 ID 不在列表中，给出友好提示
        const available = getTemplateIds();
        if (!available.includes(template_id)) {
          return {
            content: [
              {
                type: "text",
                text: `Template "${template_id}" not found.\n\nAvailable templates: ${available.join(", ")}\n\nUse list_templates for details on parameters.`,
              },
            ],
          };
        }

        const result = await selectTemplate(template_id, params as Record<string, unknown>);

        return {
          content: [
            {
              type: "text",
              text: [
                `Session created: **${result.session_id}**`,
                `Template: ${result.template.name}`,
                "",
                "Now use `modify_workflow` with this session_id to add/remove nodes,",
                "or `run_workflow` to execute the workflow.",
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ==========================================================================
  // modify_workflow - 修改 Session（接受 session_id 而非 JSON）
  // ==========================================================================
  server.tool(
    "modify_workflow",
    "Apply modification operations to a session's workflow. Supports: set_param (by template parameter name), set_input (by node input), add_node (with optional insert_between), remove_node, connect. Operates on the session identified by session_id, not on raw JSON.",
    {
      session_id: z.string().describe("Session ID (from select_template or create_workflow)"),
      operations: z
        .array(operationSchema)
        .describe(
          "Array of operations to apply in order. Each has an 'op' field: set_param, set_input, add_node, remove_node, connect, or disconnect. Use set_param to modify template parameters by name (e.g. checkpoint, positive_prompt, seed). Use add_node with insert_between to insert a node between two existing nodes.",
        ),
    },
    async ({ session_id, operations }) => {
      try {
        logger.info("Modifying session workflow", { session_id, opCount: operations.length });

        // 获取当前工作流
        const workflow = getSessionWorkflow(session_id);
        if (!workflow) {
          return {
            content: [
              {
                type: "text",
                text: `Session not found: ${session_id}. Use create_workflow or select_template first.`,
              },
            ],
          };
        }

        // 将扁平化 schema 操作转为内部 ModifyOperation 格式
        const convertedOps: ModifyOperation[] = operations.map((raw: Record<string, unknown>) => {
          const op = raw.op as string;
          switch (op) {
            case "set_param":
              return {
                op: "set_param",
                param_name: raw.param_name as string,
                value: raw.value,
              };
            case "set_input": {
              const nodeId = raw.node_id as string;
              const inputName = raw.input_name as string;
              const value = raw.value;
              logger.info("set_input operation", { node_id: nodeId, input_name: inputName, value });
              return {
                op: "set_input",
                node_id: nodeId,
                input_name: inputName,
                value,
              };
            }
            case "add_node":
              return {
                op: "add_node",
                class_type: raw.class_type as string,
                inputs: raw.inputs as Record<string, unknown> | undefined,
                id: raw.id as string | undefined,
                insert_between: raw.insert_between as { source_id: string; output_index: number; target_id: string; input_name: string } | undefined,
              };
            case "remove_node":
              return {
                op: "remove_node",
                node_id: raw.node_id as string,
              };
            case "connect":
              return {
                op: "connect",
                source_id: raw.source_id as string,
                output_index: raw.output_index as number,
                target_id: raw.target_id as string,
                input_name: raw.input_name as string,
              };
            case "disconnect":
              return {
                op: "disconnect",
                target_id: raw.disconnect_target_id as string,
                input_name: raw.disconnect_input_name as string,
              };
            default:
              throw new ValidationError(`Unknown operation: ${op}`);
          }
        });

        // 应用修改
        const result = await modifyWorkflow(workflow as WorkflowJSON, convertedOps);

        // 构建操作描述
        const opDescs = convertedOps.map((op) => {
          const base = `${op.op}`;
          const detail = "node_id" in op ? op.node_id : ("class_type" in op ? op.class_type : ("param_name" in op ? op.param_name : ""));
          return `${base} ${detail}`;
        }).join("; ");

        // 更新 Session（保存历史）
        updateSessionWorkflow(session_id, result.workflow as Record<string, unknown>, opDescs);

        // 构建返回文本
        const lines = [
          `Session **${session_id}** modified.`,
        ];

        // Operations summary
        const opSummary = convertedOps.map((op) => {
          switch (op.op) {
            case "set_input":
              return `set_input: Node \`${op.node_id}\`.\`${op.input_name}\` = ${typeof op.value === "string" ? `"${op.value}"` : JSON.stringify(op.value)}`;
            case "set_param":
              return `set_param: \`${op.param_name}\` = ${typeof op.value === "string" ? `"${op.value}"` : JSON.stringify(op.value)}`;
            case "add_node":
              return `add_node: \`${op.class_type}\` (ID: ${result.added_ids.join(", ")})`;
            case "remove_node":
              return `remove_node: \`${op.node_id}\``;
            case "connect":
              return `connect: \`${op.source_id}\` → \`${op.target_id}\`.\`${op.input_name}\``;
            default:
              return `${op.op}`;
          }
        });
        lines.push("", "**Operations:**");
        for (const s of opSummary) {
          lines.push(`- ${s}`);
        }

        if (result.connection_info && result.connection_info.length > 0) {
          lines.push("", "**Auto-connections:**");
          for (const conn of result.connection_info) {
            lines.push(
              `- Node \`${conn.node_id}\` input \`${conn.input_name}\` ← \`${conn.source_id}\`[${conn.output_index}] (type: \`${conn.matched_type}\`)`,
            );
          }
        }

        lines.push("", "Use `run_workflow` to execute, or apply more modifications.");

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  // ==========================================================================
  // get_node_info - 查询节点信息
  // ==========================================================================
  server.tool(
    "get_node_info",
    "Query a running ComfyUI server's /object_info endpoint for installed node type definitions (inputs, outputs, category, description). Requires a reachable ComfyUI instance; results reflect that server's installed custom nodes. Use the node_type filter to inspect a specific node before composing or modifying a workflow. Note: when more than 20 node types match, returns only a summarized list (name, display_name, category, description) and asks you to narrow the filter to get full input/output schemas; 20 or fewer returns complete definitions.",
    {
      node_type: z
        .string()
        .optional()
        .describe(
          "Filter by node class_type name (case-insensitive substring match). Omit to list all available nodes.",
        ),
    },
    async ({ node_type }) => {
      try {
        logger.info("Getting node info", { filter: node_type });
        const info = await getObjectInfo();

        let entries = Object.entries(info);
        if (node_type) {
          const lower = node_type.toLowerCase();
          entries = entries.filter(([name]) => name.toLowerCase().includes(lower));
        }

        if (entries.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: node_type
                  ? `No nodes found matching "${node_type}"`
                  : "No node definitions returned from ComfyUI",
              },
            ],
          };
        }

        // For large result sets, return just names + descriptions
        if (entries.length > 20) {
          const summary = entries.map(([name, def]) => ({
            name,
            display_name: def.display_name,
            category: def.category,
            description: def.description || "",
          }));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    count: summary.length,
                    nodes: summary,
                    hint: "Use a more specific node_type filter to see full definitions with inputs/outputs",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const result = Object.fromEntries(entries);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
