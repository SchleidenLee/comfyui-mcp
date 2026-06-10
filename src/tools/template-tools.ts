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
  // save_template - 保存 Session 为个性化模板
  // ==========================================================================
  server.tool(
    "save_template",
    "Save a session as a reusable custom template. The template will be saved to data/templates/custom/ and will be available in future list_templates calls.",
    {
      session_id: z.string().describe("Session ID to save"),
      name: z
        .string()
        .describe("Template name (will be converted to a slug for the file name)"),
    },
    async ({ session_id, name }) => {
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

      try {
        const result = await saveAsTemplate(session_id, name);
        return {
          content: [
            {
              type: "text",
              text: `Saved as template: **${result.id}**\nFile: ${result.file_path}`,
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
  // save_workflow - 保存 Session 为个性化工作流
  // ==========================================================================
  server.tool(
    "save_workflow",
    "Save a session as a workflow file in data/workflows/. This is for saving finished workflows, not reusable templates.",
    {
      session_id: z.string().describe("Session ID to save"),
      name: z
        .string()
        .describe("Workflow name (will be converted to a slug for the file name)"),
    },
    async ({ session_id, name }) => {
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

      try {
        const result = await saveAsWorkflow(session_id, name);
        return {
          content: [
            {
              type: "text",
              text: `Saved as workflow: **${name}**\nFile: ${result.file_path}`,
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
}
