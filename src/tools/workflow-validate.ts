import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorkflowJSON } from "../comfyui/types.js";
import { validateWorkflow } from "../services/workflow-validator.js";
import { getSessionWorkflow } from "../services/template-manager.js";
import { errorToToolResult, ValidationError } from "../utils/errors.js";

function parseWorkflow(input: unknown): WorkflowJSON {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new ValidationError("Workflow JSON must be an object with node IDs as keys");
      }
      return parsed as WorkflowJSON;
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`Invalid JSON string: ${(err as Error).message}`);
    }
  }
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as WorkflowJSON;
  }
  throw new ValidationError("Workflow must be a JSON string or object");
}

export function registerWorkflowValidateTools(server: McpServer): void {
  server.tool(
    "validate_workflow",
    "Validate a ComfyUI workflow without executing it. Checks for missing node types, broken connections, invalid output indices, missing models, and other issues. Returns errors with fix suggestions and auto_fix operations. Accepts either a session_id or a raw workflow JSON.",
    {
      session_id: z.string().optional().describe("Session ID to validate (from select_template or load_workflow)"),
      workflow: z.string().optional().describe("ComfyUI workflow in API format as JSON string. Use session_id instead if you have one."),
    },
    async ({ session_id, workflow }) => {
      try {
        let wf: WorkflowJSON;
        if (session_id) {
          const sessionWf = getSessionWorkflow(session_id);
          if (!sessionWf) {
            return {
              content: [{ type: "text" as const, text: `Session not found: ${session_id}` }],
            };
          }
          wf = sessionWf as WorkflowJSON;
        } else if (workflow) {
          wf = parseWorkflow(workflow);
        } else {
          return {
            content: [{ type: "text" as const, text: "Must provide either session_id or workflow" }],
          };
        }

        const result = await validateWorkflow(wf);

        const lines: string[] = [];
        lines.push(`## ${result.summary}`);
        lines.push("");

        if (result.issues.length === 0) {
          lines.push("No issues found. The workflow is ready to execute.");
        } else {
          const errors = result.issues.filter((i) => i.severity === "error");
          const warnings = result.issues.filter((i) => i.severity === "warning");

          if (errors.length > 0) {
            lines.push("### Errors");
            for (const issue of errors) {
              const loc = issue.node_id
                ? `Node ${issue.node_id} (${issue.node_type})`
                : "Workflow";
              lines.push(`- **${loc}**: ${issue.message}`);
              if (issue.suggestion) {
                lines.push(`  > 💡 Suggestion: ${issue.suggestion}`);
              }
              if (issue.auto_fix) {
                lines.push(`  > 🔧 Auto-fix: ${JSON.stringify(issue.auto_fix)}`);
              }
            }
            lines.push("");
          }

          if (warnings.length > 0) {
            lines.push("### Warnings");
            for (const issue of warnings) {
              const loc = issue.node_id
                ? `Node ${issue.node_id} (${issue.node_type})`
                : "Workflow";
              lines.push(`- **${loc}**: ${issue.message}`);
              if (issue.suggestion) {
                lines.push(`  > 💡 Suggestion: ${issue.suggestion}`);
              }
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
