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
// 操作 Schema
// ============================================================================

const operationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_input"),
    node_id: z.string(),
    input_name: z.string(),
    value: z.any(),
  }),
  z.object({
    op: z.literal("add_node"),
    class_type: z.string(),
    inputs: z.record(z.any()).optional(),
    id: z.string().optional(),
  }),
  z.object({
    op: z.literal("remove_node"),
    node_id: z.string(),
  }),
  z.object({
    op: z.literal("connect"),
    source_id: z.string(),
    output_index: z.number(),
    target_id: z.string(),
    input_name: z.string(),
  }),
  z.object({
    op: z.literal("insert_between"),
    source_id: z.string(),
    output_index: z.number(),
    target_id: z.string(),
    input_name: z.string(),
    new_class_type: z.string(),
    new_inputs: z.record(z.any()).optional(),
  }),
]);

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
    "Apply modification operations to a session's workflow. Supports: set_input, add_node, remove_node, connect, insert_between. Operates on the session identified by session_id, not on raw JSON.",
    {
      session_id: z.string().describe("Session ID (from select_template or create_workflow)"),
      operations: z
        .array(operationSchema)
        .describe(
          "Array of operations to apply in order. Each has an 'op' field: set_input, add_node, remove_node, connect, or insert_between",
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

        // 应用修改
        const result = modifyWorkflow(workflow as WorkflowJSON, operations as ModifyOperation[]);

        // 更新 Session
        updateSessionWorkflow(session_id, result.workflow as Record<string, unknown>);

        return {
          content: [
            {
              type: "text",
              text: [
                `Session **${session_id}** modified.`,
                `New nodes added: ${result.added_ids.length > 0 ? result.added_ids.join(", ") : "none"}`,
                "",
                "Use `run_workflow` to execute, or apply more modifications.",
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
