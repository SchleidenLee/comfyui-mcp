# ComfyUI MCP Agent 完整使用指南

> **版本**: v3.0 | **最后更新**: 2026-06-13 | **工具总数**: 80+

---

## 快速连接

```json
{
  "mcpServers": {
    "comfyui": {
      "url": "http://localhost:9101/mcp",
      "transport": "streamable-http"
    }
  }
}
```

---

## 目录

1. [核心概念](#核心概念) — 模板 / Session / 工作流
2. [工具分类速查](#工具分类速查) — 按功能分类的全部工具
3. [完整工作流程](#完整工作流程) — 从入门到实战
4. [modify_workflow 操作详解](#modify_workflow-操作详解)
5. [常见问题](#常见问题)
6. [最佳实践](#最佳实践)

---

## 核心概念

### 1. 模板（Template）

模板 = **带参数 schema 的工作流骨架**，用于快速创建可编辑的 Session。

| 类型 | 路径 | 用途 | 示例 |
|------|------|------|------|
| 预设模板 | `data/templates/presets/` | 内置基础模板（只读） | txt2img, img2img, upscale, inpaint, controlnet, ip_adapter |
| 个性化模板 | `data/templates/custom/` | 用户保存的模板（可读写，支持嵌套子文件夹） | 用户通过 `save_session(..., save_as: "template", path: "pony/lora")` 创建 |
| 导入模板 | 通过 `import_workflow_from_json` | 从网上下载的工作流 JSON 导入 | 自动检测 UI/API 格式 |

### 2. Session（会话）

Session 是 MCP 服务的**核心概念**，代表一个可编辑的工作流副本。

#### Session 生命周期

```
创建 → 编辑 → 运行 → 保存 → 关闭
  ↓      ↓      ↓      ↓      ↓
select  modify  run   save   close
```

#### Session 的三种来源

| 来源 | 工具 | 用途 |
|------|------|------|
| 从模板创建 | `select_template("txt2img", {...})` | 从零开始新工作流 |
| 从工作流加载 | `load_workflow("my.json")` | 继续编辑已有工作流 |
| 从 JSON 导入 | `import_workflow_from_json(json, "name", "session")` | 导入网上下载的工作流 |
| 从分支创建 | `fork_session("sess_xxx")` | 基于现有 Session 创建新分支 |

#### Session 状态

```json
{
  "session_id": "sess_abc123",
  "source_type": "template",
  "source_id": "txt2img",
  "node_count": 8,
  "created_seconds_ago": 120,
  "last_modified": "2026-06-12T10:00:00Z",
  "status": "active"
}
```

#### Session 持久化

- **存储位置**: `data/cache/sess_xxx.json`
- **持久化机制**: 每次修改自动保存到磁盘
- **重启恢复**: 服务重启后自动恢复所有 Session
- **清理方式**: `close_session("sess_xxx")` 删除缓存文件

### 3. 工作流（Workflow）

- `data/workflows/` — MCP 管理的成品工作流
- ComfyUI 用户库 — Web UI 侧边栏可见的工作流
- 可直接加载为 Session 继续编辑

---

## 工具分类速查

> 60+ 工具按功能分类，点击工具名查看详细说明。

### 一、模板与 Session 管理（15 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`list_templates`](#1-list_templates) | 无 | 模板列表 | 列出所有可用模板（预设 + 自定义） |
| [`get_template`](#2-get_template) | `template_id` | 模板详情+参数 schema | 查看模板的参数定义 |
| [`select_template`](#3-select_template) | `template_id`, `params?` | `session_id` | 从模板创建 Session |
| [`create_workflow`](#4-create_workflow) | `template_id`, `params?` | `session_id` | `select_template` 的别名 |
| [`load_workflow`](#5-load_workflow) | `workflow_file` | `session_id` | 从工作流文件创建 Session |
| [`import_workflow_from_json`](#import_workflow_from_json) | `workflow_json`, `name`, `save_as`, `path?` | 导入结果 | 从 JSON 字符串导入工作流 |
| [`get_session`](#6-get_session) | `session_id` | Session 状态 | 查看 Session 详情 |
| [`list_sessions`](#7-list_sessions) | 无 | 活跃 Session 列表 | 列出所有活跃 Session |
| [`close_session`](#8-close_session) | `session_id` | 关闭结果 | 关闭 Session，清理缓存 |
| [`fork_session`](#fork_session) | `session_id`, `name?` | `session_id` | 基于现有 Session 创建分支 |
| [`get_session_history`](#get_session_history) | `session_id` | 历史列表 | 查看 Session 操作历史 |
| [`undo_modify`](#undo_modify) | `session_id` | 回退结果 | 回退上一次修改 |
| [`diff_sessions`](#diff_sessions) | `session_a`, `session_b` | 差异对比 | 对比两个 Session 的差异 |
| [`save_session`](#save_session) | `session_id`, `name`, `save_as`, `path?` | 保存结果 | 统一保存工具（支持嵌套路径） |
| [`refresh_templates`](#12-refresh_templates) | 无 | 刷新结果 | 重新扫描模板目录 |

### 二、工作流操作（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`modify_workflow`](#9-modify_workflow) | `session_id`, `operations[]` | 修改结果 | 添加/删除节点、建立连接 |
| [`run_workflow`](#10-run_workflow) | `session_id` | `prompt_id` | 运行 Session 对应的工作流 |
| [`validate_workflow`](#11-validate_workflow) | `session_id` 或 `workflow` JSON（二选一） | 验证结果+修复建议 | 执行前检查工作流完整性，返回错误+自动修复建议 |
| [`refresh_templates`](#12-refresh_templates) | 无 | 刷新结果 | 重新扫描模板目录 |

### 三、执行与监控（8 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`enqueue_workflow`](#13-enqueue_workflow) | `workflow` JSON | `prompt_id`, 队列位置 | 直接提交完整 JSON 工作流 |
| [`get_job_status`](#14-get_job_status) | `prompt_id` | 运行状态 | 查看单个任务状态 |
| [`get_history`](#15-get_history) | `prompt_id?` | 执行历史+输出 | 查看任务执行结果和错误 |
| [`get_queue`](#16-get_queue) | 无 | 队列状态 | 查看当前运行和待执行任务 |
| [`cancel_job`](#17-cancel_job) | `prompt_id?` | 取消结果 | 取消正在运行的任务 |
| [`cancel_queued_job`](#18-cancel_queued_job) | `prompt_id` | 取消结果 | 取消队列中的待执行任务 |
| [`clear_queue`](#19-clear_queue) | 无 | 清除结果 | 清空所有待执行任务 |
| [`view_image`](#20-view_image) | `asset_id` | 图片 | 查看生成的图片 |

### 四、图片与资产管理（8 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_image`](#21-get_image) | `filename`, `type?`, `subfolder?`, `save_dir?` | 图片+保存路径 | 从 ComfyUI 获取输出图片 |
| [`list_assets`](#22-list_assets) | `limit?`, `since?` | 资产列表 | 列出最近生成的资产 |
| [`get_asset_metadata`](#23-get_asset_metadata) | `asset_id` | 资产元数据+工作流快照 | 查看资产的产生参数 |
| [`regenerate`](#24-regenerate) | `asset_id`, `overrides?`, `disable_random_seed?` | `prompt_id` | 用相同参数重新生成 |
| [`upload_image`](#25-upload_image) | `source_path`, `filename?` | 上传文件名 | 上传图片到 ComfyUI input 目录 |
| [`upload_video`](#26-upload_video) | `source_path`, `filename?` | 上传文件名 | 上传视频到 ComfyUI input 目录 |
| [`upload_audio`](#27-upload_audio) | `source_path`, `filename?` | 上传文件名 | 上传音频到 ComfyUI input 目录 |
| [`workflow_from_image`](#28-workflow_from_image) | `image_path` | 工作流 JSON | 从 PNG 提取嵌入的工作流 |

### 五、工作流库管理（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`list_workflows`](#29-list_workflows) | 无 | 工作流文件列表 | 列出 ComfyUI 用户库中的工作流 |
| [`get_workflow`](#30-get_workflow) | `filename`, `format?` | 工作流 JSON | 加载已保存的工作流 |
| [`save_workflow`](#31-save_workflow) | `filename`, `workflow` JSON | 保存结果 | 保存到 ComfyUI 用户库 |
| [`analyze_workflow`](#32-analyze_workflow) | `filename`, `view?`, `section?` | 结构化分析 | 分析工作流结构（AI 友好） |

### 六、可视化与 DSL（5 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`visualize_workflow`](#33-visualize_workflow) | `workflow` JSON, `show_values?`, `direction?` | Mermaid 图 | 将工作流转为流程图 |
| [`visualize_workflow_hierarchical`](#34-visualize_workflow_hierarchical) | `workflow`, `view?`, `section?` | Mermaid 图/文本 | 分层可视化大型工作流 |
| [`mermaid_to_workflow`](#35-mermaid_to_workflow) | `mermaid` 文本 | JSON 工作流 | Mermaid 图转工作流 |
| [`workflow_to_dsl`](#36-workflow_to_dsl) | `workflow` JSON | DSL 文本 | 工作流转人类可读 DSL |
| [`dsl_to_workflow`](#37-dsl_to_workflow) | `dsl` 文本 | JSON 工作流 | DSL 转工作流 JSON |

### 七、节点信息（1 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_node_info`](#38-get_node_info) | `node_type?` | 节点定义 | 查询节点输入输出 schema |

### 八、模型管理（5 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`search_models`](#39-search_models) | `query`, `filter?`, `limit?` | 模型列表 | 搜索 HuggingFace 模型 |
| [`download_model`](#40-download_model) | `url`, `target_subfolder`, `filename?`, `auth?` | 保存路径 | 下载模型到本地 |
| [`download_civitai_model`](#41-download_civitai_model) | `target_subfolder`, `model_id?`, `model_version_id?`, `filename?` | 保存路径 | 从 CivitAI 下载模型 |
| [`list_local_models`](#42-list_local_models) | `model_type?` | 本地模型列表 | 列出已安装的模型 |
| [`remove_model`](#43-remove_model) | `path` | 删除结果 | 删除本地模型文件 |

### 九、自定义节点管理（9 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`search_custom_nodes`](#44-search_custom_nodes) | `query`, `limit?`, `page?` | 节点包列表 | 搜索 ComfyUI Registry |
| [`get_node_pack_details`](#45-get_node_pack_details) | `id` | 节点包详情 | 查看节点包详细信息 |
| [`install_custom_node`](#46-install_custom_node) | `id`, `source?`, `version?`, `ref?`, `mode?`, `channel?`, `useCmCli?` | 安装结果 | 安装自定义节点 |
| [`update_custom_node`](#47-update_custom_node) | `id`, `mode?`, `channel?`, `useCmCli?` | 更新结果 | 更新自定义节点 |
| [`reinstall_custom_node`](#48-reinstall_custom_node) | `id`, `version?`, `mode?`, `channel?`, `useCmCli?` | 重装结果 | 重新安装自定义节点 |
| [`fix_custom_node`](#49-fix_custom_node) | `id`, `mode?`, `channel?`, `useCmCli?` | 修复结果 | 修复自定义节点依赖 |
| [`list_installed_nodes`](#50-list_installed_nodes) | `mode?`, `useCmCli?` | 已安装节点列表 | 列出已安装的节点包 |
| [`sync_node_dependencies`](#51-sync_node_dependencies) | 无 | 同步结果 | 同步所有节点 Python 依赖 |
| [`list_node_snapshots`](#52-list_node_snapshots) | 无 | 快照列表 | 列出节点快照 |

### 十、节点快照与二分排查（5 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`save_node_snapshot`](#53-save_node_snapshot) | `name?` | 快照结果 | 保存当前节点状态快照 |
| [`restore_node_snapshot`](#54-restore_node_snapshot) | `name` | 恢复结果 | 恢复节点快照 |
| [`bisect_start`](#55-bisect_start) | 无 | 二分开始结果 | 开始二分排查故障节点 |
| [`bisect_good`](#56-bisect_good) | 无 | 排查结果 | 标记当前节点集为正常 |
| [`bisect_bad`](#57-bisect_bad) | 无 | 排查结果 | 标记当前节点集为异常 |

### 十一、节点开发与验证（3 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`scaffold_custom_node`](#58-scaffold_custom_node) | `name`, `display_name`, `category?`, `description?`, `publisher_id?`, `with_frontend?`, `with_ci?`, `overwrite?` | 脚手架结果 | 创建自定义节点开发模板 |
| [`verify_custom_node`](#59-verify_custom_node) | `name?`, `class_types?`, `restart?` | 验证结果 | 验证自定义节点是否正常加载 |
| [`publish_custom_node`](#60-publish_custom_node) | `name?`, `path?` | 发布结果 | 发布节点到 Comfy Registry |

### 十二、诊断与日志（2 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_logs`](#61-get_logs) | `max_lines?`, `keyword?` | 日志文本 | 获取 ComfyUI 运行日志 |
| [`get_history`](#62-get_history) | `prompt_id?` | 执行历史 | 查看任务执行详情（含错误堆栈） |

### 十三、系统与内存管理（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_system_stats`](#63-get_system_stats) | 无 | 系统信息 | 查看 GPU 显存、ComfyUI 版本等 |
| [`clear_vram`](#64-clear_vram) | `unload_models?`, `free_memory?` | 清理结果 | 释放 GPU 显存 |
| [`get_embeddings`](#65-get_embeddings) | 无 | 嵌入模型列表 | 列出已安装的 textual inversion 嵌入 |
| [`health_check`](#66-health_check) | `model_categories?`, `recent_errors?` | 健康报告 | 全面诊断 ComfyUI 状态 |

### 十四、工作流依赖（2 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`extract_workflow_dependencies`](#67-extract_workflow_dependencies) | `workflow` JSON | 依赖分析 | 分析工作流需要的自定义节点 |
| [`install_workflow_dependencies`](#68-install_workflow_dependencies) | `workflow` JSON | 安装结果 | 自动安装工作流缺失的节点 |

### 十五、默认值与生成统计（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_defaults`](#69-get_defaults) | 无 | 默认值配置 | 查看当前默认参数 |
| [`set_defaults`](#70-set_defaults) | `values`, `persist?` | 更新结果 | 设置默认参数 |
| [`suggest_settings`](#71-suggest_settings) | `model_family?`, `lora_hash?`, `search?`, `limit?` | 推荐参数 | 基于历史数据推荐最佳参数 |
| [`generation_stats`](#72-generation_stats) | `model_family?` | 统计信息 | 查看生成历史统计 |

### 十六、图片转换与上传（3 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`convert_image`](#73-convert_image) | `asset_id?`, `path?`, `format`, `quality?`, `progressive?`, `lossless?`, `effort?`, `out_path?` | 转换结果 | 转换图片格式 |
| [`upload_output`](#74-upload_output) | `asset_id?`, `path?`, `destination` | 上传结果 | 上传生成结果到云存储 |
| [`list_output_images`](#75-list_output_images) | `limit?`, `pattern?` | 图片列表 | 列出 ComfyUI 输出目录的图片 |

### 十七、快捷生成（3 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`generate_image`](#76-generate_image) | `prompt`, `negative_prompt?`, `width?`, `height?`, `steps?`, `cfg?`, `sampler?`, `scheduler?`, `seed?`, `checkpoint?`, `batch_size?` | `prompt_id` | 快捷文生图（自动构建工作流） |
| [`generate_with_controlnet`](#77-generate_with_controlnet) | `prompt`, `control_image`, `controlnet_model?`, `strength?`, + 通用参数 | `prompt_id` | ControlNet 条件生成 |
| [`generate_with_ip_adapter`](#78-generate_with_ip_adapter) | `prompt`, `reference_image`, `weight?`, `preset?`, + 通用参数 | `prompt_id` | IP-Adapter 参考图生成 |

### 十八、工作空间与环境（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`get_workspace`](#79-get_workspace) | 无 | 工作空间信息 | 查看当前 ComfyUI 安装路径 |
| [`set_default_workspace`](#80-set_default_workspace) | `path` | 设置结果 | 设置默认工作空间 |
| [`list_workspaces`](#81-list_workspaces) | 无 | 工作空间列表 | 列出检测到的 ComfyUI 安装 |
| [`get_environment`](#82-get_environment) | 无 | 环境信息 | 查看 ComfyUI 环境详情 |

### 十九、进程控制（3 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`stop_comfyui`](#83-stop_comfyui) | 无 | 停止结果 | 停止 ComfyUI 进程 |
| [`start_comfyui`](#84-start_comfyui) | 无 | 启动结果 | 启动 ComfyUI |
| [`restart_comfyui`](#85-restart_comfyui) | 无 | 重启结果 | 重启 ComfyUI |

### 二十、其他工具（4 个）

| 工具 | 参数 | 返回 | 用途 |
|------|------|------|------|
| [`apply_manifest`](#86-apply_manifest) | `manifest?`, `path?` | 应用结果 | 应用 ComfyUI 配置清单 |
| [`install_comfyui`](#87-install_comfyui) | `target_path`, `skip_manager?`, `use_uv?`, `version?` | 安装报告 | 全新安装 ComfyUI |
| [`update_comfyui`](#88-update_comfyui) | 无 | 更新结果 | 更新 ComfyUI 核心 |
| [`update_all`](#89-update_all) | 无 | 更新结果 | 更新所有自定义节点 |

---

## 工具详细说明

### 1. list_templates

列出所有可用模板（预设 + 自定义）。

**参数**: 无

**返回**:
```json
{
  "templates": [
    {"id": "txt2img", "name": "Text to Image", "category": "generation", "source": "preset"},
    {"id": "img2img", "name": "Image to Image", "category": "generation", "source": "preset"},
    {"id": "upscale", "name": "Upscale", "category": "generation", "source": "preset"},
    {"id": "inpaint", "name": "Inpaint", "category": "generation", "source": "preset"},
    {"id": "controlnet", "name": "ControlNet", "category": "control", "source": "preset"},
    {"id": "ip_adapter", "name": "IP Adapter", "category": "control", "source": "preset"},
    {"id": "my_lora", "name": "My LoRA Template", "category": "custom", "source": "custom"}
  ]
}
```

---

### 2. get_template

查看模板的参数定义。

**参数**:
- `template_id` (必需): 模板 ID

**返回**:
```json
{
  "id": "txt2img",
  "name": "Text to Image",
  "category": "generation",
  "source": "preset",
  "parameters": {
    "checkpoint": {"type": "model", "default": "sd_xl_base_1.0.safetensors"},
    "positive_prompt": {"type": "text", "default": ""},
    "negative_prompt": {"type": "text", "default": ""},
    "width": {"type": "number", "default": 1024, "min": 256, "max": 2048},
    "height": {"type": "number", "default": 1024, "min": 256, "max": 2048},
    "steps": {"type": "number", "default": 30, "min": 1, "max": 150},
    "cfg": {"type": "number", "default": 7.0, "min": 1.0, "max": 30.0},
    "sampler_name": {"type": "string", "default": "dpmpp_2m"},
    "scheduler": {"type": "string", "default": "karras"},
    "seed": {"type": "number", "default": -1}
  }
}
```

---

### 3. select_template

从模板创建 Session。

**参数**:
- `template_id` (必需): 模板 ID
- `params` (可选): 模板参数，覆盖默认值

**返回**:
```json
{
  "session_id": "sess_abc123",
  "template": "txt2img",
  "status": "active",
  "node_count": 8
}
```

---

### 4. create_workflow

`select_template` 的别名，兼容旧版 API。

**参数**:
- `template_id` (必需)
- `params` (可选)

---

### 5. load_workflow

从工作流文件创建 Session。

**参数**:
- `workflow_file` (必需): 工作流文件名（从 `data/workflows/` 或 ComfyUI 用户库）

**返回**:
```json
{
  "session_id": "sess_def456",
  "source_type": "workflow",
  "source_id": "my_lora_workflow.json",
  "node_count": 12
}
```

---

### 6. get_session

查看 Session 详情。

**参数**:
- `session_id` (必需)

---

### 7. list_sessions

列出所有活跃 Session。

**参数**: 无

---

### 8. close_session

关闭 Session，清理缓存文件。

**参数**:
- `session_id` (必需)

---

### save_session

统一保存工具，替代 `save_session_as_template` 和 `save_session_as_workflow`。

**参数**:
- `session_id` (必需): Session ID
- `name` (必需): 保存名称
- `save_as` (必需): `"template"` 或 `"workflow"`
- `path` (可选): 嵌套子文件夹路径（如 `"pony/lora"`），自动创建不存在的目录
- `sync_to_webui` (可选): 如果 true，同时同步到 ComfyUI WebUI 用户库（仅 workflow 模式）

**示例**:
```json
// 保存到 templates/custom/pony/lora_v1.json
save_session("sess_xxx", "lora_v1", { save_as: "template", path: "pony" })

// 保存到 workflows/最终版.json
save_session("sess_xxx", "最终版", { save_as: "workflow" })
```

---

### import_workflow_from_json

从 JSON 字符串导入工作流（支持网上下载的 UI/API 格式）。

**参数**:
- `workflow_json` (必需): 完整工作流 JSON 字符串
- `name` (必需): 导入名称
- `save_as` (必需): `"session"` / `"template"` / `"workflow"`
- `path` (可选): 子文件夹路径

**示例**:
```json
import_workflow_from_json(json_string, "下载的LoRA工作流", "session")
// → 返回 session_id，可直接编辑
```

---

### fork_session

基于现有 Session 创建分支（不影响原 Session）。

**参数**:
- `session_id` (必需): 源 Session ID
- `name` (可选): 分支名称

**示例**:
```json
fork_session("sess_abc123", "v2尝试")
// → 返回新的 session_id
```

---

### get_session_history

查看 Session 的操作历史。

**参数**:
- `session_id` (必需)

**返回**:
```
## Session History (3 operations)

1. [10:00:00] select_template txt2img
2. [10:05:00] add_node LoraLoader; connect 1
3. [10:10:00] set_input 3
```

---

### undo_modify

回退上一次修改（需要之前有修改操作）。

**参数**:
- `session_id` (必需)

---

### diff_sessions

对比两个 Session 的差异。

**参数**:
- `session_a` (必需)
- `session_b` (必需)

**返回**: 节点增删改对比报告

---

### 9. modify_workflow

修改 Session 对应的工作流。支持 5 种操作。

**参数**:
- `session_id` (必需)
- `operations[]` (必需): 操作数组

**操作类型**:
| op | 参数 | 说明 |
|----|------|------|
| `set_input` | `node_id`, `input_name`, `value` | 修改节点参数 |
| `add_node` | `class_type`, `inputs?`, `id?` | 添加新节点 |
| `remove_node` | `node_id` | 删除节点 |
| `connect` | `source_id`, `output_index`, `target_id`, `input_name` | 建立连接 |
| `insert_between` | `source_id`, `output_index`, `target_id`, `input_name`, `new_class_type`, `new_inputs?` | 在两个节点之间插入 |

**返回**:
```json
{
  "success": true,
  "added_ids": ["8"],
  "message": "Session sess_abc123 modified. Use run_workflow to execute."
}
```

---

### 10. run_workflow

运行 Session 对应的工作流。

**参数**:
- `session_id` (必需)

**返回**:
```json
{
  "prompt_id": "prompt_xyz789",
  "queue_position": 1,
  "status": "queued"
}
```

---

### 11. validate_workflow

验证工作流完整性（执行前必做）。每个错误都附带**修复建议**和**自动修复操作**。

**参数**:
- `session_id` (可选): Session ID（推荐，直接传 ID 不用传 JSON）
- `workflow` (可选): 完整 JSON 工作流（与 session_id 二选一）

**返回（成功）**:
```json
{
  "valid": true,
  "message": "Workflow is valid"
}
```

**返回（失败，含修复建议）**:
```
## Workflow has 1 error(s) and 0 warning(s)

### Errors
- **Node 8 (KSampler)**: Missing required input "model"
  >  Suggestion: Connect node 1 output 0 (MODEL) to node 8 input "model"
  > 🔧 Auto-fix: {"op":"connect","source_id":"1","output_index":0,"target_id":"8","input_name":"model"}
```

**自动修复流程**:
1. `validate_workflow("sess_xxx")` → 发现错误 + 获取 `auto_fix` 操作
2. `modify_workflow("sess_xxx", [auto_fix])` → 应用修复
3. `validate_workflow("sess_xxx")` → 再次验证确认通过
4. `run_workflow("sess_xxx")` → 执行

---

### 12. refresh_templates

重新扫描模板目录（添加新模板后使用）。

**参数**: 无

---

### 13. enqueue_workflow

直接提交完整 JSON 工作流（高级模式）。

**参数**:
- `workflow` (必需): ComfyUI API 格式工作流 JSON
- `disable_random_seed` (可选): 如果 true，不随机化种子

**返回**:
```json
{
  "status": "enqueued",
  "prompt_id": "prompt_abc",
  "queue_remaining": 0
}
```

---

### 14. get_job_status

查看单个任务状态。

**参数**:
- `prompt_id` (必需)

---

### 15. get_history

查看任务执行结果和错误详情（含 Python traceback）。

**参数**:
- `prompt_id` (可选): 省略则返回最近一次执行

---

### 16. get_queue

查看当前运行和待执行任务。

**参数**: 无

---

### 17. cancel_job

取消正在运行的任务。

**参数**:
- `prompt_id` (可选): 省略则取消当前运行的任务

---

### 18. cancel_queued_job

取消队列中的待执行任务。

**参数**:
- `prompt_id` (必需)

---

### 19. clear_queue

清空所有待执行任务。

**参数**: 无

---

### 20. view_image

查看生成的图片（通过 asset_id）。

**参数**:
- `asset_id` (必需)

**返回**: 内联图片内容块

---

### 21. get_image

从 ComfyUI 获取输出图片并保存到本地。

**参数**:
- `filename` (必需): 输出文件名
- `type` (可选): `output` / `input` / `temp`（默认 `output`）
- `subfolder` (可选): 子文件夹
- `save_dir` (可选): 保存目录

---

### 22. list_assets

列出最近生成的资产（图片/视频/音频）。

**参数**:
- `limit` (可选): 最大返回数量
- `since` (可选): ISO 时间戳，只返回此时间之后的资产

---

### 23. get_asset_metadata

查看资产的产生参数（完整工作流快照）。

**参数**:
- `asset_id` (必需)

---

### 24. regenerate

用相同参数重新生成（可覆盖部分参数）。

**参数**:
- `asset_id` (必需)
- `overrides` (可选): 参数覆盖，如 `{"seed": 123, "cfg": 8.0}`
- `disable_random_seed` (可选): 如果 true，保持原种子

---

### 25. upload_image

上传图片到 ComfyUI `input/` 目录。

**参数**:
- `source_path` (必需): 本地文件绝对路径
- `filename` (可选): 覆盖文件名

---

### 26. upload_video

上传视频到 ComfyUI `input/` 目录（支持 .mp4, .mov, .webm, .avi, .mkv, .m4v）。

---

### 27. upload_audio

上传音频到 ComfyUI `input/` 目录（支持 .wav, .mp3, .flac, .ogg, .m4a, .aac）。

---

### 28. workflow_from_image

从 ComfyUI 生成的 PNG 提取嵌入的工作流元数据。

**参数**:
- `image_path` (必需): PNG 文件绝对路径

---

### 29. list_workflows

列出 ComfyUI 用户库中的工作流（Web UI 侧边栏可见）。

**参数**: 无

---

### 30. get_workflow

加载已保存的工作流 JSON。

**参数**:
- `filename` (必需)
- `format` (可选): `api` / `ui`（默认 `api`）

---

### 31. save_workflow

保存到 ComfyUI 用户库。

**参数**:
- `filename` (必需)
- `workflow` (必需): API 或 UI 格式 JSON

---

### 32. analyze_workflow

结构化分析工作流（AI 友好，不返回完整 JSON）。

**参数**:
- `filename` (必需)
- `view` (可选): `summary` / `overview` / `detail` / `list` / `flat`（默认 `summary`）
- `section` (可选): 用于 `detail` 视图的分区名

---

### 33. visualize_workflow

将工作流转为 Mermaid 流程图。

**参数**:
- `workflow` (必需): JSON 工作流
- `show_values` (可选): 显示参数值（默认 true）
- `direction` (可选): `LR` / `TB`（默认 `LR`）

---

### 34. visualize_workflow_hierarchical

分层可视化大型工作流（20+ 节点）。

**参数**:
- `workflow` (必需)
- `view` (可选): `overview` / `detail` / `list` / `summary`
- `section` (可选): 用于 `detail` 视图
- `show_values` (可选)
- `direction` (可选)

---

### 35. mermaid_to_workflow

Mermaid 图转 ComfyUI 工作流 JSON。

**参数**:
- `mermaid` (必需): Mermaid 流程图文本

---

### 36. workflow_to_dsl

工作流转人类可读 DSL。

**参数**:
- `workflow` (必需)

---

### 37. dsl_to_workflow

DSL 转工作流 JSON。

**参数**:
- `dsl` (必需)

---

### 38. get_node_info

查询节点输入输出 schema。

**参数**:
- `node_type` (可选): 节点类型过滤（模糊匹配）

**返回**:
```json
{
  "LoraLoader": {
    "input": {
      "required": {
        "model": ["MODEL"],
        "clip": ["CLIP"],
        "lora_name": [["model1.safetensors", "model2.safetensors"], {}],
        "strength_model": ["FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}],
        "strength_clip": ["FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}]
      }
    },
    "output": ["MODEL", "CLIP"],
    "output_is_list": [false, false],
    "name": "LoraLoader",
    "display_name": "LoraLoader",
    "description": "",
    "category": "loaders"
  }
}
```

---

### 39. search_models

搜索 HuggingFace 模型。

**参数**:
- `query` (必需)
- `filter` (可选): 如 `diffusers`
- `limit` (可选): 默认 10

---

### 40. download_model

下载模型到本地。

**参数**:
- `url` (必需)
- `target_subfolder` (必需): `checkpoints` / `loras` / `vae` / `controlnet` / `embeddings` / `clip` / `diffusion_models` / `text_encoders` / `unet`
- `filename` (可选)
- `auth` (可选): 认证信息（bearer / basic / header / query / s3）

---

### 41. download_civitai_model

从 CivitAI 下载模型。

**参数**:
- `target_subfolder` (必需)
- `model_id` (可选)
- `model_version_id` (可选)
- `filename` (可选)

---

### 42. list_local_models

列出已安装的模型。

**参数**:
- `model_type` (可选): 按类型过滤

---

### 43. remove_model

删除本地模型文件。

**参数**:
- `path` (必需): 相对于 `models/` 的路径

---

### 44. search_custom_nodes

搜索 ComfyUI Registry。

**参数**:
- `query` (必需)
- `limit` (可选): 默认 10
- `page` (可选): 默认 1

---

### 45. get_node_pack_details

查看节点包详细信息。

**参数**:
- `id` (必需): 节点包 ID

---

### 46. install_custom_node

安装自定义节点。

**参数**:
- `id` (必需): 注册表 ID / git URL / 节点包名
- `source` (可选): `registry` / `git` / `auto`（默认 `auto`）
- `version` (可选): 版本号
- `ref` (可选): git ref
- `mode` (可选): `remote` / `local` / `cache`
- `channel` (可选): 频道名
- `useCmCli` (可选): 强制使用 cm-cli

---

### 47. update_custom_node

更新自定义节点（传 `all` 更新全部）。

**参数**:
- `id` (必需)
- `mode`, `channel`, `useCmCli` (可选)

---

### 48. reinstall_custom_node

重新安装自定义节点。

---

### 49. fix_custom_node

修复自定义节点依赖。

---

### 50. list_installed_nodes

列出已安装的节点包。

**参数**:
- `mode` (可选): `default` / `imported`
- `useCmCli` (可选)

---

### 51. sync_node_dependencies

同步所有节点 Python 依赖。

---

### 52. list_node_snapshots

列出节点快照。

---

### 53. save_node_snapshot

保存当前节点状态快照。

**参数**:
- `name` (可选): 自定义快照名

---

### 54. restore_node_snapshot

恢复节点快照。

**参数**:
- `name` (必需)

---

### 55. bisect_start

开始二分排查故障节点。

---

### 56. bisect_good

标记当前节点集为正常（问题不存在）。

---

### 57. bisect_bad

标记当前节点集为异常（问题存在）。

---

### 58. scaffold_custom_node

创建自定义节点开发模板。

**参数**:
- `name` (必需): 包名（小写 slug）
- `display_name` (必需): 显示名
- `category` (可选): 节点菜单分类
- `description` (可选)
- `publisher_id` (可选)
- `with_frontend` (可选): 生成前端 stub
- `with_ci` (可选): 生成 GitHub Actions 发布流程
- `overwrite` (可选)

---

### 59. verify_custom_node

验证自定义节点是否正常加载。

**参数**:
- `name` (可选): 包名
- `class_types` (可选): 显式指定节点类型
- `restart` (可选): 重启 ComfyUI 后验证（默认 true）

---

### 60. publish_custom_node

发布节点到 Comfy Registry。

**参数**:
- `name` (可选)
- `path` (可选)

---

### 61. get_logs

获取 ComfyUI 运行日志。

**参数**:
- `max_lines` (可选): 默认 100
- `keyword` (可选): 关键词过滤

---

### 62. get_history

查看任务执行历史（含错误堆栈）。

---

### 63. get_system_stats

查看系统信息（GPU 显存、版本等）。

---

### 64. clear_vram

释放 GPU 显存。

**参数**:
- `unload_models` (可选): 卸载模型（默认 true）
- `free_memory` (可选): 释放缓存（默认 true）

---

### 65. get_embeddings

列出 textual inversion 嵌入。

---

### 66. health_check

全面诊断 ComfyUI 状态。

**参数**:
- `model_categories` (可选): 要检查的模型类别
- `recent_errors` (可选): 包含的最近错误行数

---

### 67. extract_workflow_dependencies

分析工作流需要的自定义节点。

**参数**:
- `workflow` (必需)

---

### 68. install_workflow_dependencies

自动安装工作流缺失的节点。

**参数**:
- `workflow` (必需)

---

### 69. get_defaults

查看当前默认参数。

---

### 70. set_defaults

设置默认参数。

**参数**:
- `values` (必需): 键值对
- `persist` (可选): 是否持久化到配置文件

---

### 71. suggest_settings

基于历史数据推荐最佳参数。

**参数**:
- `model_family` (可选): 如 `sdxl` / `flux`
- `lora_hash` (可选)
- `search` (可选): 模型名搜索
- `limit` (可选): 默认 10

---

### 72. generation_stats

查看生成历史统计。

**参数**:
- `model_family` (可选)

---

### 73. convert_image

转换图片格式。

**参数**:
- `asset_id` 或 `path` (二选一)
- `format` (必需): `png` / `jpeg` / `webp`
- `quality` (可选): 1-100
- `progressive` (可选): JPEG 渐进式
- `lossless` (可选): WebP 无损
- `effort` (可选): WebP 编码努力 0-6
- `out_path` (可选): 输出路径

---

### 74. upload_output

上传生成结果到云存储（S3 / Azure / HTTP PUT / HuggingFace）。

**参数**:
- `asset_id` 或 `path` (二选一)
- `destination` (必需): `{s3: {...}}` / `{azure: {...}}` / `{http: {...}}` / `{hf: {...}}`

---

### 75. list_output_images

列出 ComfyUI 输出目录的图片。

**参数**:
- `limit` (可选): 默认 20
- `pattern` (可选): 文件名过滤

---

### 76. generate_image

快捷文生图（自动构建工作流）。

**参数**:
- `prompt` (必需)
- `negative_prompt` (可选)
- `width` / `height` / `steps` / `cfg` / `sampler` / `scheduler` / `seed` (可选)
- `checkpoint` (可选): 自动选择
- `batch_size` (可选)

---

### 77. generate_with_controlnet

ControlNet 条件生成。

**参数**:
- `prompt` (必需)
- `control_image` (必需): 已上传的控制图文件名
- `controlnet_model` (可选): 自动选择
- `strength` (可选): 控制强度
- 通用参数: `width` / `height` / `steps` / `cfg` / `sampler` / `scheduler` / `seed` / `checkpoint`

---

### 78. generate_with_ip_adapter

IP-Adapter 参考图生成。

**参数**:
- `prompt` (必需)
- `reference_image` (必需): 已上传的参考图文件名
- `weight` (可选): IP-Adapter 权重
- `preset` (可选): 预设（默认 `PLUS (high strength)`）
- 通用参数

---

### 79. get_workspace

查看当前 ComfyUI 安装路径。

---

### 80. set_default_workspace

设置默认工作空间。

**参数**:
- `path` (必需)

---

### 81. list_workspaces

列出检测到的 ComfyUI 安装。

---

### 82. get_environment

查看 ComfyUI 环境详情。

---

### 83. stop_comfyui

停止 ComfyUI 进程。

---

### 84. start_comfyui

启动 ComfyUI。

---

### 85. restart_comfyui

重启 ComfyUI。

---

### 86. apply_manifest

应用 ComfyUI 配置清单。

**参数**:
- `manifest` 或 `path` (二选一)

---

### 87. install_comfyui

全新安装 ComfyUI。

**参数**:
- `target_path` (必需)
- `skip_manager` (可选)
- `use_uv` (可选)
- `version` (可选)

---

### 88. update_comfyui

更新 ComfyUI 核心。

---

### 89. update_all

更新所有自定义节点。

---

## 完整工作流程

### 场景 1：从零开始生成图片

```
1. list_templates()                    // 列出可用模板
2. select_template("txt2img", {        // 创建 Session
     checkpoint: "PonyDiffusionV6XL.safetensors",
     positive_prompt: "1girl, beautiful",
     width: 1024, height: 1024
   })
   → session_id: "sess_abc123"
3. modify_workflow("sess_abc123", [    // 添加 LoRA
     { op: "insert_between", source_id: "1", output_index: 0, target_id: "4",
       input_name: "model", new_class_type: "LoraLoader",
       new_inputs: { lora_name: "add-detail-xl.safetensors", strength_model: 0.8, strength_clip: 0.8 } }
   ])
4. validate_workflow("sess_abc123")    // 验证
5. run_workflow("sess_abc123")         // 运行
   → prompt_id: "prompt_xyz789"
6. get_job_status("prompt_xyz789")     // 监控
7. save_session_as_workflow("sess_abc123", "我的Lora工作流_v1")  // 保存
8. close_session("sess_abc123")        // 清理
```

### 场景 2：加载已有工作流继续编辑

```
1. list_workflows()                    // 列出已有工作流
2. load_workflow("我的Lora工作流.json")  // 加载为 Session
   → session_id: "sess_def456"
3. modify_workflow("sess_def456", [...]) // 修改
4. run_workflow("sess_def456")         // 运行
```

### 场景 3：快捷生成（不用 Session）

```
generate_image({
  prompt: "1girl, beautiful, masterpiece",
  checkpoint: "PonyDiffusionV6XL.safetensors",
  width: 1024, height: 1024
})
→ prompt_id: "prompt_abc"
```

### 场景 4：从图片反向工程工作流

```
1. workflow_from_image("/path/to/ComfyUI_00001_.png")
   → 提取出完整工作流 JSON
2. 用此 JSON 调用 enqueue_workflow() 或 save_workflow()
```

### 场景 5：排查故障节点

```
1. bisect_start()                      // 开始二分
2. 重启 ComfyUI，测试工作流
3. bisect_good() 或 bisect_bad()       // 根据结果标记
4. 重复步骤 2-3 直到找到故障节点
5. bisect_reset()                      // 恢复所有节点
```

---

## modify_workflow 操作详解

### 1. set_input — 修改节点参数

```json
{
  "op": "set_input",
  "node_id": "3",
  "input_name": "text",
  "value": "1girl, beautiful, masterpiece"
}
```

### 2. add_node — 添加新节点

```json
{
  "op": "add_node",
  "class_type": "LoraLoader",
  "inputs": {
    "lora_name": "add-detail-xl.safetensors",
    "strength_model": 0.8,
    "strength_clip": 0.8,
    "model": ["1", 0],
    "clip": ["1", 1]
  }
}
```
返回新节点的 `node_id`。

### 3. remove_node — 删除节点

```json
{"op": "remove_node", "node_id": "8"}
```

### 4. connect — 建立连接

```json
{
  "op": "connect",
  "source_id": "1",
  "output_index": 0,
  "target_id": "5",
  "input_name": "model"
}
```
含义：节点 1 的输出 0 → 节点 5 的 model 输入。

### 5. insert_between — 在两个节点之间插入

```json
{
  "op": "insert_between",
  "source_id": "1",
  "output_index": 0,
  "target_id": "5",
  "input_name": "model",
  "new_class_type": "LoraLoader",
  "new_inputs": {
    "lora_name": "xxx.safetensors",
    "strength_model": 0.8,
    "strength_clip": 0.8
  }
}
```
自动：断开 1→5，插入新节点，连线 1→新→5。

---

## 常见问题

### Q: 如何知道节点 ID？
用 `get_session("sess_xxx")` 查看当前 Session 的节点列表，或用 `visualize_workflow` 生成 Mermaid 图。

### Q: 如何查节点参数？
```
get_node_info("LoraLoader")
→ 返回 inputs/outputs schema，包含参数名、类型、默认值
```

### Q: 工作流运行失败怎么调试？
```
1. get_history("prompt_xxx") → 查看 Python traceback
2. get_logs(keyword="error") → 查看 ComfyUI 日志
3. validate_workflow("sess_xxx") → 执行前验证
```

### Q: Session 会持久化吗？
会。Session 存储在 `data/cache/`，重启服务后自动恢复。用 `list_sessions()` 查看，`close_session()` 清理。

### Q: 如何添加自定义模板？
1. 从预设模板创建 Session
2. 修改工作流
3. `save_session("sess_xxx", "我的模板", { save_as: "template" })`
4. 以后直接 `select_template("我的模板")` 使用

### Q: 如何保存到嵌套子文件夹？
```
save_session("sess_xxx", "lora_v1", { save_as: "template", path: "pony/experimental" })
→ 保存到 data/templates/custom/pony/experimental/lora_v1.json
```

### Q: 如何回退误操作？
```
modify_workflow("sess_xxx", [...])  // 误操作
undo_modify("sess_xxx")             // 回退到之前状态
```

### Q: 如何对比两个 Session 的差异？
```
diff_sessions("sess_abc", "sess_def")
→ 返回新增/删除/修改的节点列表
```

### Q: 如何从网上下载的工作流 JSON 导入？
```
import_workflow_from_json(json_string, "下载的LoRA工作流", "session")
→ 返回 session_id，可直接用 modify_workflow 编辑
```

### Q: 如何查看 Session 的操作历史？
```
get_session_history("sess_xxx")
→ 返回所有操作记录（时间戳 + 操作描述）
```

---

## 最佳实践

1. **每次操作前验证**: `validate_workflow("sess_xxx")` → 确认没问题再跑，出错时利用 `auto_fix` 自动修复
2. **用完关闭 Session**: `close_session("sess_xxx")` → 释放内存
3. **保存重要工作流**: `save_session("sess_xxx", "版本名", { save_as: "workflow" })` → 防丢失，支持嵌套路径
4. **查询节点信息**: 加新节点前先 `get_node_info()` → 避免参数错误
5. **小步修改**: 每次 `modify_workflow` 只做 1-2 个操作 → 出错容易定位
6. **用 insert_between 简化连线**: 比手动 add_node + connect 更简单
7. **快捷生成优先**: 简单场景用 `generate_image`，复杂场景用 Session + `modify_workflow`
8. **定期检查健康**: 批量任务前用 `health_check()` 确认 ComfyUI 状态
9. **利用 Session 历史**: 修改前 `get_session_history()` 查看做了什么，出错时 `undo_modify()` 回退
10. **分支实验**: 用 `fork_session()` 创建新分支尝试不同参数，不影响原工作流
11. **对比差异**: 用 `diff_sessions()` 对比不同版本，确认改了什么
12. **导入外部工作流**: 用 `import_workflow_from_json()` 导入网上下载的工作流，自动识别 UI/API 格式
