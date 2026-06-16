/**
 * Template Tools - 模板管理相关 MCP 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listTemplates,
  getTemplate,
  getTemplateIds,
  selectTemplate,
  loadWorkflowSession,
  getSession,
  getSessionWorkflow,
  listSessions,
  closeSession,
  saveAsTemplate,
  saveAsWorkflow,
  saveSession,
  importFromJson,
  forkSession,
  getSessionHistory,
  undoModify,
  diffSessions,
  formatDiff,
  refreshTemplates,
} from "../services/template-manager.js";
import { logger } from "../utils/logger.js";

/**
 * 注册所有模板管理工具
 */
export function registerTemplateTools(server: McpServer): void {
  // ==========================================================================
  // list_templates - 列出所有可用模板
  // ==========================================================================
  server.tool(
    "list_templates",
    "List available workflow templates (presets and custom). Returns template IDs, names, categories, and parameters. Use select_template to create a session from a template.",
    {
      category: z
        .string()
        .optional()
        .describe("Filter by category (e.g., 'generation', 'upscaling')"),
      source: z
        .enum(["preset", "custom"])
        .optional()
        .describe("Filter by source: 'preset' (built-in) or 'custom' (user-created)"),
    },
    async ({ category, source }) => {
      const templates = listTemplates({ category, source });

      if (templates.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No templates found. Make sure data/templates/presets/ contains template JSON files.",
            },
          ],
        };
      }

      const lines = templates.map((t) => {
        const paramList = Object.entries(t.parameters)
          .map(([k, v]) => {
            const defaultStr = v.default !== undefined ? ` (default: ${v.default})` : "";
            return `  - ${k}: ${v.type}${defaultStr}`;
          })
          .join("\n");

        return [
          `**${t.id}** (${t.source})`,
          `  Name: ${t.name}`,
          `  Category: ${t.category}`,
          `  Description: ${t.description}`,
          `  Parameters:\n${paramList}`,
        ].join("\n");
      });

      return {
        content: [
          {
            type: "text",
            text: `## Available Templates (${templates.length})\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    },
  );

  // ==========================================================================
  // get_template - 获取模板详情
  // ==========================================================================
  server.tool(
    "get_template",
    "Get detailed information about a specific template, including its full workflow JSON structure.",
    {
      template_id: z.string().describe("Template ID (use list_templates to see available IDs)"),
    },
    async ({ template_id }) => {
      const template = getTemplate(template_id);
      if (!template) {
        return {
          content: [
            {
              type: "text",
              text: `Template not found: ${template_id}. Available: ${getTemplateIds().join(", ")}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(template, null, 2),
          },
        ],
      };
    },
  );

  // ==========================================================================
  // select_template - 从模板创建 Session
  // ==========================================================================
  server.tool(
    "select_template",
    "Create an editable session from a template. Returns a session_id that you use with modify_workflow, run_workflow, etc. The session is a copy of the template, so modifications don't affect the original.",
    {
      template_id: z.string().describe("Template ID to create session from"),
      params: z
        .record(z.any())
        .optional()
        .describe(
          "Optional parameters to apply to the template (e.g., checkpoint name, prompt, dimensions)",
        ),
    },
    async ({ template_id, params }) => {
      try {
        const result = await selectTemplate(template_id, params);
        return {
          content: [
            {
              type: "text",
              text: [
                `Session created: **${result.session_id}**`,
                `Template: ${result.template.name} (${result.template.id})`,
                "",
                "Use this session_id with:",
                "- `modify_workflow` to add/remove nodes or change connections",
                "- `run_workflow` to execute the workflow",
                "- `get_session` to view current state",
                "- `save_workflow` to save as a permanent workflow file",
                "- `save_template` to save as a reusable template",
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  // ==========================================================================
  // load_workflow - 从工作流文件创建 Session
  // ==========================================================================
  server.tool(
    "load_workflow",
    "Load an existing workflow file into an editable session. Use this to continue editing a previously saved workflow.",
    {
      workflow_file: z
        .string()
        .describe("Workflow filename (with or without .json extension) from data/workflows/"),
    },
    async ({ workflow_file }) => {
      try {
        const result = await loadWorkflowSession(workflow_file);
        return {
          content: [
            {
              type: "text",
              text: [
                `Session created: **${result.session_id}**`,
                `Loaded from: ${workflow_file}`,
                `Nodes: ${Object.keys(result.workflow).length}`,
                "",
                "Use this session_id with modify_workflow, run_workflow, etc.",
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  // ==========================================================================
  // get_session - 获取 Session 状态
  // ==========================================================================
  server.tool(
    "get_session",
    "Get the current state of a session, including node count and modification info.",
    {
      session_id: z.string().describe("Session ID (returned by select_template or load_workflow)"),
    },
    async ({ session_id }) => {
      const session = getSession(session_id);
      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: `Session not found: ${session_id}. Use select_template or load_workflow to create one.`,
            },
          ],
        };
      }

      const nodeCount = Object.keys(session.workflow).length;
      const age = Math.round((Date.now() - session.created_at) / 1000);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                session_id: session.id,
                source_type: session.source_type,
                source_id: session.source_id,
                node_count: nodeCount,
                created_seconds_ago: age,
                last_modified: new Date(session.last_modified).toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ==========================================================================
  // list_sessions - 列出所有活跃 Session
  // ==========================================================================
  server.tool(
    "list_sessions",
    "List all active sessions. Sessions expire after 24 hours of inactivity.",
    {},
    async () => {
      const sessions = listSessions();

      if (sessions.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No active sessions. Use select_template or load_workflow to create one.",
            },
          ],
        };
      }

      const lines = sessions.map((s) => {
        const age = Math.round((Date.now() - s.created_at) / 1000);
        return `- **${s.id}** (${s.source_type}: ${s.source_id || "unknown"}) - created ${age}s ago`;
      });

      return {
        content: [
          {
            type: "text",
            text: `## Active Sessions (${sessions.length})\n\n${lines.join("\n")}`,
          },
        ],
      };
    },
  );

  // ==========================================================================
  // close_session - 关闭 Session
  // ==========================================================================
  server.tool(
    "close_session",
    "Close and delete a session to free memory. The session's cache file will be removed.",
    {
      session_id: z.string().describe("Session ID to close"),
    },
    async ({ session_id }) => {
      const session = getSession(session_id);
      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: `Session not found: ${session_id}`,
            },
          ],
        };
      }

      await closeSession(session_id);

      return {
        content: [
          {
            type: "text",
            text: `Session ${session_id} closed.`,
          },
        ],
      };
    },
  );

  // ==========================================================================
  // save_session - 统一保存工具（模板/工作流 + 嵌套路径）
  // ==========================================================================
  server.tool(
    "save_session",
    "Save a session as a template or workflow. Supports nested subdirectories (e.g., 'pony/lora_v1'). Use this instead of save_session_as_template/save_session_as_workflow.",
    {
      session_id: z.string().describe("Session ID to save"),
      name: z.string().describe("Save name (will be converted to slug for file name)"),
      save_as: z.enum(["template", "workflow"]).describe("Save as 'template' (reusable) or 'workflow' (finished)"),
      path: z.string().optional().describe("Nested subdirectory path (e.g., 'pony/lora'). Creates directories if they don't exist."),
      sync_to_webui: z.boolean().optional().describe("If true, also save to ComfyUI WebUI user library (workflow only)"),
    },
    async ({ session_id, name, save_as, path, sync_to_webui }) => {
      const session = getSession(session_id);
      if (!session) {
        return {
          content: [{ type: "text", text: `Session not found: ${session_id}` }],
        };
      }

      try {
        const result = await saveSession(session_id, name, {
          save_as,
          sub_path: path,
          sync_to_webui,
        });

        const lines = [`Saved as ${save_as}: **${result.name}**`, `File: ${result.file_path}`];
        if (result.webui_path) {
          lines.push(`ComfyUI WebUI: ${result.webui_path}`);
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // ==========================================================================
  // refresh_templates - 刷新模板缓存
  // ==========================================================================
  server.tool(
    "refresh_templates",
    "Reload all templates from disk. Use this after adding new template files to data/templates/.",
    {},
    async () => {
      const result = await refreshTemplates();
      return {
        content: [
          {
            type: "text",
            text: `Templates refreshed. ${result.count} templates loaded.`,
          },
        ],
      };
    },
  );

  // ==========================================================================
  // import_workflow_from_json - 从 JSON 导入工作流
  // ==========================================================================
  server.tool(
    "import_workflow_from_json",
    "Import a workflow JSON (e.g., downloaded from the web) and save it as a session, template, or workflow. Supports UI and API format auto-detection.",
    {
      workflow_json: z.string().describe("Complete workflow JSON string (UI or API format)"),
      name: z.string().describe("Name for the imported workflow"),
      save_as: z.enum(["session", "template", "workflow"]).describe("How to save: 'session' (editable), 'template' (reusable), or 'workflow' (finished)"),
      path: z.string().optional().describe("Subdirectory path (e.g., 'downloads/pony')"),
    },
    async ({ workflow_json, name, save_as, path }) => {
      try {
        const imported = await importFromJson(workflow_json, name, {
          save_as,
          sub_path: path,
        });
        const lines = [`Imported: **${imported.name}**`, `File: ${imported.file_path}`];
        if (imported.session_id) {
          lines.push(`Session ID: ${imported.session_id}`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  );

  // ==========================================================================
  // fork_session - 基于现有 Session 创建分支
  // ==========================================================================
  server.tool(
    "fork_session",
    "Create a new session as a copy/branch of an existing session. Use this to try different modifications without affecting the original.",
    {
      session_id: z.string().describe("Source session ID to fork from"),
      name: z.string().optional().describe("Optional name for the new branch (defaults to auto-generated ID)"),
    },
    async ({ session_id, name }) => {
      const session = getSession(session_id);
      if (!session) {
        return { content: [{ type: "text", text: `Session not found: ${session_id}` }] };
      }
      try {
        const forked = await forkSession(session_id, name);
        return {
          content: [
            {
              type: "text",
              text: `Forked session: **${forked.session_id}**\nSource: ${session_id}\nNodes: ${Object.keys(forked.workflow).length}`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  );

  // ==========================================================================
  // get_session_history - 查看 Session 操作历史
  // ==========================================================================
  server.tool(
    "get_session_history",
    "View the modification history of a session. Shows all operations applied since creation.",
    {
      session_id: z.string().describe("Session ID to view history for"),
    },
    async ({ session_id }) => {
      const history = getSessionHistory(session_id);
      if (!history) {
        return { content: [{ type: "text", text: `Session not found: ${session_id}` }] };
      }
      if (history.length === 0) {
        return { content: [{ type: "text", text: "No modifications recorded for this session." }] };
      }
      const lines = history.map((h, i) => {
        const time = new Date(h.timestamp).toLocaleTimeString();
        return `${i + 1}. [${time}] ${h.operation}`;
      });
      return {
        content: [{ type: "text", text: `## Session History (${history.length} operations)\n\n${lines.join("\n")}` }],
      };
    },
  );

  // ==========================================================================
  // undo_modify - 回退上一次修改
  // ==========================================================================
  server.tool(
    "undo_modify",
    "Undo the last modification to a session. Restores the session to its previous state.",
    {
      session_id: z.string().describe("Session ID to undo"),
    },
    async ({ session_id }) => {
      const session = getSession(session_id);
      if (!session) {
        return { content: [{ type: "text", text: `Session not found: ${session_id}` }] };
      }
      try {
        const result = await undoModify(session_id);
        return {
          content: [{ type: "text", text: `Undo successful. Session ${session_id} restored to previous state.\nNodes: ${result.node_count}` }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  );

  // ==========================================================================
  // diff_sessions - 对比两个 Session 的差异
  // ==========================================================================
  server.tool(
    "diff_sessions",
    "Compare two sessions and show differences in node count, parameters, and connections.",
    {
      session_a: z.string().describe("First session ID"),
      session_b: z.string().describe("Second session ID"),
    },
    async ({ session_a, session_b }) => {
      const sessionA = getSession(session_a);
      const sessionB = getSession(session_b);
      if (!sessionA) return { content: [{ type: "text", text: `Session not found: ${session_a}` }] };
      if (!sessionB) return { content: [{ type: "text", text: `Session not found: ${session_b}` }] };
      try {
        const diff = diffSessions(session_a, session_b);
        return {
          content: [{ type: "text", text: formatDiff(diff) }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  );
}
