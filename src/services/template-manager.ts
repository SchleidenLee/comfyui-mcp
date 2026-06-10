/**
 * Template Manager - 模板管理系统
 *
 * 负责：
 * 1. 加载预设模板 (data/templates/presets/)
 * 2. 加载个性化模板 (data/templates/custom/)
 * 3. Session 管理 (data/cache/)
 * 4. 个性化工作流管理 (data/workflows/)
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { logger } from "../utils/logger.js";

// ============================================================================
// 类型定义
// ============================================================================

/** 模板参数定义 */
export interface TemplateParamDef {
  type: "text" | "number" | "model" | "select" | "boolean";
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  model_type?: string;
  multiline?: boolean;
  random?: boolean;
  required?: boolean;
  description?: string;
}

/** 模板结构 */
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: Record<string, TemplateParamDef>;
  workflow: Record<string, unknown>; // ComfyUI API 格式工作流
  source: "preset" | "custom";
  file_path: string;
  modified_at?: string;
}

/** Session 状态 */
export interface Session {
  id: string;
  source_type: "template" | "workflow";
  source_id?: string;
  workflow: Record<string, unknown>;
  created_at: number;
  last_modified: number;
}

/** Session 创建参数 */
export interface CreateSessionParams {
  template_id?: string;
  workflow_file?: string;
  params?: Record<string, unknown>;
}

// ============================================================================
// 配置
// ============================================================================

function getDataDir(): string {
  // 优先使用环境变量，否则使用项目根目录下的 data
  return process.env.COMFYUI_MCP_DATA_DIR || path.join(process.cwd(), "data");
}

function getTemplatesDir(): string {
  return path.join(getDataDir(), "templates");
}

function getPresetsDir(): string {
  return path.join(getTemplatesDir(), "presets");
}

function getCustomTemplatesDir(): string {
  return path.join(getTemplatesDir(), "custom");
}

function getCacheDir(): string {
  return path.join(getDataDir(), "cache");
}

function getWorkflowsDir(): string {
  return path.join(getDataDir(), "workflows");
}

// ============================================================================
// 内存状态
// ============================================================================

/** 加载的模板缓存: id -> Template */
const templateCache = new Map<string, Template>();

/** 活跃的 Session: session_id -> Session */
const sessionStore = new Map<string, Session>();

/** Session 过期时间（毫秒）：默认 24 小时 */
const SESSION_TTL = parseInt(process.env.COMFYUI_MCP_SESSION_TTL || "86400") * 1000;

// ============================================================================
// 工具函数
// ============================================================================

/** 生成 session_id */
function generateSessionId(): string {
  return `sess_${crypto.randomBytes(8).toString("hex")}`;
}

/** 确保目录存在 */
async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** 解析 JSON 文件 */
async function loadJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

/** 写入 JSON 文件 */
async function saveJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ============================================================================
// 模板加载
// ============================================================================

/**
 * 加载单个模板文件
 */
async function loadTemplate(filePath: string, source: "preset" | "custom"): Promise<Template> {
  const data = await loadJsonFile<Template>(filePath);

  // 确保必要字段
  if (!data.id || !data.workflow) {
    throw new Error(`Invalid template file: ${filePath} (missing id or workflow)`);
  }

  return {
    ...data,
    source,
    file_path: filePath,
  };
}

/**
 * 扫描目录加载所有模板
 */
async function scanTemplates(dir: string, source: "preset" | "custom"): Promise<void> {
  try {
    const exists = await fs.stat(dir).catch(() => null);
    if (!exists) return;

    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(dir, file);
      try {
        const template = await loadTemplate(filePath, source);
        templateCache.set(template.id, template);
        logger.debug(`Loaded template: ${template.id} (${source})`);
      } catch (err) {
        logger.warn(`Failed to load template ${filePath}: ${err}`);
      }
    }
  } catch (err) {
    logger.warn(`Failed to scan templates dir ${dir}: ${err}`);
  }
}

/**
 * 加载所有模板（预设 + 自定义）
 */
export async function loadAllTemplates(): Promise<void> {
  templateCache.clear();
  await scanTemplates(getPresetsDir(), "preset");
  await scanTemplates(getCustomTemplatesDir(), "custom");
  logger.info(`Loaded ${templateCache.size} templates`);
}

/**
 * 刷新模板缓存
 */
export async function refreshTemplates(): Promise<{ count: number }> {
  await loadAllTemplates();
  return { count: templateCache.size };
}

// ============================================================================
// 模板查询
// ============================================================================

/**
 * 列出所有模板
 */
export function listTemplates(filter?: {
  category?: string;
  source?: "preset" | "custom";
}): Template[] {
  let templates = Array.from(templateCache.values());

  if (filter?.category) {
    templates = templates.filter((t) => t.category === filter.category);
  }
  if (filter?.source) {
    templates = templates.filter((t) => t.source === filter.source);
  }

  return templates;
}

/**
 * 获取模板详情
 */
export function getTemplate(templateId: string): Template | undefined {
  return templateCache.get(templateId);
}

/**
 * 获取所有可用模板 ID
 */
export function getTemplateIds(): string[] {
  return Array.from(templateCache.keys());
}

// ============================================================================
// Session 管理
// ============================================================================

/**
 * 将参数应用到工作流模板
 *
 * 策略：
 * 1. 精确匹配节点输入字段名
 * 2. 对于特殊字段（如 seed/steps/cfg 等），在所有节点中查找并替换
 */
function applyParamsToWorkflow(
  workflow: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(workflow));

  // 需要全局查找并替换的特殊参数（出现在多个节点中）
  const globalParams = new Set(["seed", "steps", "cfg", "denoise", "sampler_name", "scheduler"]);

  for (const [paramName, paramValue] of Object.entries(params)) {
    if (paramValue === undefined || paramValue === null) continue;

    for (const [nodeId, node] of Object.entries(result) as [string, Record<string, unknown>][]) {
      const inputs = node.inputs as Record<string, unknown> | undefined;
      if (!inputs) continue;

      // 精确匹配
      if (inputs[paramName] !== undefined) {
        inputs[paramName] = paramValue;
      }
      // 对于特殊参数，在所有节点中查找（如 KSampler 的 seed/steps/cfg）
      else if (globalParams.has(paramName)) {
        // 检查是否是数字类型的输入（跳过连接引用）
        const existingValue = inputs[paramName];
        if (existingValue !== undefined && typeof existingValue === "number") {
          inputs[paramName] = paramValue;
        }
      }
    }
  }

  return result;
}

/**
 * 从模板创建 Session
 */
export async function selectTemplate(
  templateId: string,
  params?: Record<string, unknown>,
): Promise<{ session_id: string; template: Template }> {
  const template = templateCache.get(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}. Available: ${getTemplateIds().join(", ")}`);
  }

  const sessionId = generateSessionId();
  let workflow = template.workflow;

  if (params && Object.keys(params).length > 0) {
    workflow = applyParamsToWorkflow(workflow, params);
  }

  const session: Session = {
    id: sessionId,
    source_type: "template",
    source_id: templateId,
    workflow,
    created_at: Date.now(),
    last_modified: Date.now(),
  };

  sessionStore.set(sessionId, session);

  // 写入 cache 文件（持久化到磁盘，防止服务重启丢失）
  const cacheFile = path.join(getCacheDir(), `${sessionId}.json`);
  await saveJsonFile(cacheFile, session);

  logger.info(`Created session ${sessionId} from template ${templateId}`);

  return { session_id: sessionId, template };
}

/**
 * 从工作流文件加载 Session
 */
export async function loadWorkflowSession(
  workflowFile: string,
): Promise<{ session_id: string; workflow: Record<string, unknown> }> {
  const workflowsDir = getWorkflowsDir();
  const filePath = workflowFile.endsWith(".json")
    ? path.join(workflowsDir, workflowFile)
    : path.join(workflowsDir, `${workflowFile}.json`);

  const workflow = await loadJsonFile<Record<string, unknown>>(filePath);

  const sessionId = generateSessionId();
  const session: Session = {
    id: sessionId,
    source_type: "workflow",
    source_id: workflowFile,
    workflow,
    created_at: Date.now(),
    last_modified: Date.now(),
  };

  sessionStore.set(sessionId, session);

  const cacheFile = path.join(getCacheDir(), `${sessionId}.json`);
  await saveJsonFile(cacheFile, session);

  logger.info(`Created session ${sessionId} from workflow ${workflowFile}`);

  return { session_id: sessionId, workflow };
}

/**
 * 获取 Session
 */
export function getSession(sessionId: string): Session | undefined {
  return sessionStore.get(sessionId);
}

/**
 * 获取 Session 的工作流
 */
export function getSessionWorkflow(sessionId: string): Record<string, unknown> | undefined {
  const session = sessionStore.get(sessionId);
  return session?.workflow;
}

/**
 * 更新 Session 的工作流
 */
export function updateSessionWorkflow(
  sessionId: string,
  workflow: Record<string, unknown>,
): void {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  session.workflow = workflow;
  session.last_modified = Date.now();

  // 同步到磁盘
  const cacheFile = path.join(getCacheDir(), `${sessionId}.json`);
  saveJsonFile(cacheFile, session).catch((err) => {
    logger.warn(`Failed to sync session to disk: ${err}`);
  });
}

/**
 * 列出所有活跃 Session
 */
export function listSessions(): { id: string; source_type: string; source_id?: string; created_at: number; last_modified: number }[] {
  return Array.from(sessionStore.values()).map((s) => ({
    id: s.id,
    source_type: s.source_type,
    source_id: s.source_id,
    created_at: s.created_at,
    last_modified: s.last_modified,
  }));
}

/**
 * 关闭（删除）Session
 */
export async function closeSession(sessionId: string): Promise<void> {
  sessionStore.delete(sessionId);

  // 删除 cache 文件
  const cacheFile = path.join(getCacheDir(), `${sessionId}.json`);
  await fs.unlink(cacheFile).catch(() => {});

  logger.info(`Closed session ${sessionId}`);
}

/**
 * 清理过期 Session
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessionStore.entries()) {
    if (now - session.last_modified > SESSION_TTL) {
      sessionStore.delete(id);
      await fs.unlink(path.join(getCacheDir(), `${id}.json`)).catch(() => {});
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired sessions`);
  }

  return cleaned;
}

/**
 * 从磁盘恢复 Session（服务重启时调用）
 */
export async function restoreSessionsFromDisk(): Promise<number> {
  const cacheDir = getCacheDir();
  try {
    const exists = await fs.stat(cacheDir).catch(() => null);
    if (!exists) return 0;

    const files = await fs.readdir(cacheDir);
    let restored = 0;

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const session = await loadJsonFile<Session>(path.join(cacheDir, file));
        sessionStore.set(session.id, session);
        restored++;
      } catch (err) {
        logger.warn(`Failed to restore session from ${file}: ${err}`);
      }
    }

    logger.info(`Restored ${restored} sessions from disk`);
    return restored;
  } catch (err) {
    logger.warn(`Failed to restore sessions: ${err}`);
    return 0;
  }
}

// ============================================================================
// 保存
// ============================================================================

/**
 * 保存 Session 为个性化模板
 */
export async function saveAsTemplate(
  sessionId: string,
  name: string,
): Promise<{ id: string; file_path: string }> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 生成模板 ID
  const templateId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const template: Omit<Template, "source" | "file_path"> = {
    id: templateId,
    name,
    category: "custom",
    description: `Saved from session ${sessionId}`,
    parameters: {}, // 可以从 workflow 推断，暂时留空
    workflow: session.workflow,
    modified_at: new Date().toISOString(),
  };

  const filePath = path.join(getCustomTemplatesDir(), `${templateId}.json`);
  await saveJsonFile(filePath, template);

  // 重新加载到缓存
  const loaded = await loadTemplate(filePath, "custom");
  templateCache.set(loaded.id, loaded);

  logger.info(`Saved session ${sessionId} as template ${templateId}`);

  return { id: templateId, file_path: filePath };
}

/**
 * 保存 Session 为个性化工作流
 */
export async function saveAsWorkflow(
  sessionId: string,
  name: string,
): Promise<{ file_path: string }> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const fileName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const filePath = path.join(getWorkflowsDir(), `${fileName}.json`);
  await saveJsonFile(filePath, session.workflow);

  logger.info(`Saved session ${sessionId} as workflow ${fileName}`);

  return { file_path: filePath };
}

// ============================================================================
// 初始化
// ============================================================================

/**
 * 初始化模板管理器（启动时调用）
 */
export async function initTemplateManager(): Promise<{
  templates: number;
  restored_sessions: number;
}> {
  await ensureDir(getPresetsDir());
  await ensureDir(getCustomTemplatesDir());
  await ensureDir(getCacheDir());
  await ensureDir(getWorkflowsDir());

  // 并行加载模板和恢复 Session
  await Promise.all([loadAllTemplates(), restoreSessionsFromDisk()]);

  return {
    templates: templateCache.size,
    restored_sessions: sessionStore.size,
  };
}
