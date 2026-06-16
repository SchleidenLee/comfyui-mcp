import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listLocalModels,
  downloadModel,
  MODEL_SUBDIRS,
} from "../services/model-resolver.js";
import { errorToToolResult } from "../utils/errors.js";
import type { DownloadAuth } from "../services/download-auth.js";

const modelTypeEnum = z.enum(MODEL_SUBDIRS);

const downloadAuthSchema = z.object({
  type: z.string().describe("Auth type: bearer, basic, header, query, or s3"),
  token: z.string().optional().describe("Bearer token value (for bearer)"),
  username: z.string().optional().describe("Basic auth username (for basic)"),
  password: z.string().optional().describe("Basic auth password (for basic)"),
  header_name: z.string().optional().describe("HTTP header name (for header)"),
  header_value: z.string().optional().describe("HTTP header value (for header)"),
  query_param: z.string().optional().describe("Query parameter name (for query)"),
  query_value: z.string().optional().describe("Query parameter value (for query)"),
  access_key_id: z.string().optional().describe("AWS/S3 access key id (for s3)"),
  secret_access_key: z.string().optional().describe("AWS/S3 secret access key (for s3)"),
  session_token: z.string().optional().describe("Optional S3 session token (for s3)"),
  region: z.string().optional().describe("Optional AWS region (for s3)"),
  endpoint: z.string().url().optional().describe("Optional S3 endpoint (for s3)"),
}).optional();

function convertToDownloadAuth(input: NonNullable<typeof downloadAuthSchema._output>): DownloadAuth {
  switch (input.type) {
    case "bearer":
      return { type: "bearer", token: input.token! };
    case "basic":
      return { type: "basic", username: input.username!, password: input.password! };
    case "header":
      return { type: "header", header_name: input.header_name!, header_value: input.header_value! };
    case "query":
      return { type: "query", query_param: input.query_param!, query_value: input.query_value! };
    case "s3":
      return {
        type: "s3",
        access_key_id: input.access_key_id!,
        secret_access_key: input.secret_access_key!,
        session_token: input.session_token,
        region: input.region,
        endpoint: input.endpoint,
      };
    default:
      throw new Error(`Unknown auth type: ${input.type}`);
  }
}

export function registerModelManagementTools(server: McpServer): void {
  server.tool(
    "download_model",
    "Download a model file to the ComfyUI models directory from a URL (HuggingFace, direct HTTP(S), s3://, or Azure Blob)",
    {
      url: z.string().url().describe("Direct download URL for the model file"),
      target_subfolder: modelTypeEnum.describe(
        "Target subfolder under ComfyUI models/ (e.g. 'checkpoints', 'loras', 'vae')",
      ),
      filename: z
        .string()
        .optional()
        .describe("Override filename (auto-detected from URL if omitted)"),
      auth: downloadAuthSchema
        .describe(
          "Optional per-request authentication for private/gated model URLs. " +
            "When provided it overrides built-in HuggingFace/CivitAI token handling. " +
            "Specify `type` as one of: bearer (with `token`), basic (with `username`/`password`), " +
            "header (with `header_name`/`header_value`), query (with `query_param`/`query_value`), " +
            "or s3 (with `access_key_id`/`secret_access_key`, optionally `session_token`/`region`/`endpoint`).",
        ),
    },
    async (args) => {
      try {
        const auth = args.auth ? convertToDownloadAuth(args.auth) : undefined;
        const savedPath = await downloadModel(
          args.url,
          args.target_subfolder,
          args.filename,
          auth,
        );

        return {
          content: [
            {
              type: "text",
              text: `Model downloaded successfully to:\n${savedPath}`,
            },
          ],
        };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );

  server.tool(
    "list_local_models",
    "List model files installed in the local ComfyUI models/ directory (filesystem scan), grouped by type with size and modified time. Read-only; requires COMFYUI_PATH (local installs only) and does NOT contact ComfyUI or the network.",
    {
      model_type: modelTypeEnum
        .optional()
        .describe(
          "Filter by model type (e.g. 'checkpoints', 'loras'). Lists all types if omitted.",
        ),
    },
    async (args) => {
      try {
        const models = await listLocalModels(args.model_type);

        if (models.length === 0) {
          const scope = args.model_type
            ? `No ${args.model_type} models found.`
            : "No local models found.";
          return { content: [{ type: "text", text: scope }] };
        }

        // Group by type
        const grouped = new Map<string, typeof models>();
        for (const m of models) {
          const list = grouped.get(m.type) ?? [];
          list.push(m);
          grouped.set(m.type, list);
        }

        const lines: string[] = [];
        for (const [type, list] of grouped) {
          lines.push(`## ${type} (${list.length})`);
          for (const m of list) {
            const sizeMB = (m.size / 1024 / 1024).toFixed(1);
            lines.push(`- ${m.name} (${sizeMB} MB) — modified ${m.modified}`);
          }
          lines.push("");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return errorToToolResult(err);
      }
    },
  );
}
