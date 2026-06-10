# ComfyUI MCP 魔改计划

基于 [comfyui-mcp](https://github.com/artokun/comfyui-mcp) fork 版本的功能增强计划。

---

## 一、模板系统重构

### 现状
- 模板硬编码在 `src/services/workflow-composer.ts` 的 `TEMPLATES` 对象中
- 共 6 个模板：txt2img、img2img、upscale、inpaint、controlnet、ip_adapter
- 加新模板需修改代码并重新编译

### 目标
1. **模板外挂（JSON 文件化）**
   ```
   data/
   ├── templates/
   │   ├── presets/          # 预设模板（只读，随代码发布）
   │   │   ├── txt2img.json
   │   │   ├── img2img.json
   │   │   ├── upscale.json
   │   │   ├── inpaint.json
   │   │   ├── controlnet.json
   │   │   ── ip_adapter.json
   │   └── custom/           # 用户自定义（可写）
   │       └── (用户添加的模板)
   └── templates.index.json  # 模板索引（启动时生成）
   ```

2. **模板 JSON 结构**
   ```json
   {
     "id": "txt2img",
     "name": "Text to Image",
     "category": "generation",
     "description": "基础文生图工作流",
     "parameters": {
       "checkpoint": {
         "type": "model",
         "model_type": "checkpoints",
         "default": "sd_xl_base_1.0.safetensors",
         "required": true
       },
       "positive_prompt": {
         "type": "text",
         "default": "",
         "multiline": true
       },
       "negative_prompt": {
         "type": "text",
         "default": "",
         "multiline": true
       },
       "width": {
         "type": "number",
         "default": 1024,
         "min": 256,
         "max": 2048,
         "step": 64
       },
       "height": {
         "type": "number",
         "default": 1024,
         "min": 256,
         "max": 2048,
         "step": 64
       },
       "steps": {
         "type": "number",
         "default": 20,
         "min": 1,
         "max": 100
       },
       "cfg": {
         "type": "number",
         "default": 8.0,
         "min": 1.0,
         "max": 30.0
       },
       "seed": {
         "type": "number",
         "default": -1,
         "random": true
       },
       "sampler_name": {
         "type": "select",
         "default": "euler",
         "options": ["euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_3m_sde"]
       },
       "scheduler": {
         "type": "select",
         "default": "normal",
         "options": ["normal", "karras", "exponential", "sgm_uniform"]
       }
     },
     "workflow": {
       // 完整 ComfyUI 工作流 JSON
     }
   }
   ```

3. **Session 概念**
   - `select_template(template_id)` → 返回 `session_id`
   - Session 是模板的可编辑副本，存储在内存中
   - `modify_workflow(session_id, operations)` → 修改 session
   - `run_workflow(session_id)` → 执行 session 中的工作流
   - `save_workflow(session_id, name)` → 保存为新模板

4. **启动时缓存**
   - 扫描 `data/templates/` 目录，加载所有模板到内存
   - 生成 `templates.index.json` 索引（id → 元数据映射）
   - 提供 `refresh_templates()` 工具刷新缓存

### 实现文件
| 文件 | 改动 |
|------|------|
| `src/services/template-manager.ts` | **新增**：模板加载、索引、session 管理 |
| `src/services/workflow-composer.ts` | **修改**：从模板管理器读取模板，而非硬编码 |
| `src/tools/workflow-compose.ts` | **修改**：`create_workflow` 改用模板管理器 |
| `src/tools/template-tools.ts` | **新增**：`list_templates`, `select_template`, `refresh_templates` |
| `data/templates/presets/*.json` | **新增**：将现有 6 个模板导出为 JSON |

---

## 二、LoRA 触发词自动注入

### 现状
- Agent 需手动查询 LoRA 触发词，手动追加到 Prompt
- 无自动注入机制

### 目标
1. **LoRA 元数据预扫描**
   - 启动时扫描 `ComfyUI/models/loras/` 目录
   - 解析每个 `.safetensors` 文件的 `__metadata__` 头
   - 提取 `ss_training_comment`、`ss_tag_frequency` 等字段
   - 生成 `data/loras_metadata.json` 索引

2. **注入逻辑**
   - Agent 调用 `add_lora` 或 `insert_node` 添加 LoRA 节点时
   - 自动查询元数据索引，获取触发词
   - 找到工作流中的 CLIPTextEncode 节点（正向 Prompt）
   - 追加触发词到 `text` 字段（去重处理）

3. **元数据格式**
   ```json
   {
     "filename": "add-detail-xl.safetensors",
     "trigger_words": ["detailed", "intricate"],
     "training_comment": "Trigger words: detailed, intricate",
     "tag_frequency": { "detailed": 150, "intricate": 120 },
     "base_model": "sd_xl_base_1.0",
     "civitai_id": null
   }
   ```

### 实现文件
| 文件 | 改动 |
|------|------|
| `src/services/lora-metadata.ts` | **新增**：LoRA 元数据扫描、缓存、查询 |
| `src/services/workflow-composer.ts` | **修改**：`add_node` 操作增加 LoRA 触发词注入逻辑 |
| `src/tools/lora-tools.ts` | **新增**：`add_lora` 快捷工具（可选） |

---

## 三、Prompt 数据库和注入系统

### 目录结构
```
data/
└── prompts/
    ├── metadata.json           # 索引文件（加速查询）
    ├── text_encoder/           # 一级：节点类型
    │   ├── pony/              # 二级：模型
    │   │   ├── quality/       # 三级：类别
    │   │   │   ├── score_9.json
    │   │   │   ├── score_8_up.json
    │   │   │   └── masterpiece.json
    │   │   ├── style/
    │   │   │   ├── anime.json
    │   │   │   ├── realistic.json
    │   │   │   └── oil_painting.json
    │   │   ├── character/
    │   │   │   ├── 1girl.json
    │   │   │   ├── 1boy.json
    │   │   │   └── solo.json
    │   │   ├── background/
    │   │   │   ├── city.json
    │   │   │   ├── forest.json
    │   │   │   └── interior.json
    │   │   ├── detail/
    │   │   │   ├── highly_detailed.json
    │   │   │   └── intricate.json
    │   │   └── material/
    │   │       ├── silk.json
    │   │       ── leather.json
    │   └── sd15/
    │       └── ...
    ├── controlnet/
    │   ├── openpose/
    │   │   └── ...
    │   └── depth/
    │       └── ...
    └── kSampler/
        └── ...
```

### Prompt JSON 格式
```json
{
  "id": "pony_quality_score_9",
  "name": "Score 9",
  "category": "quality",
  "model": "pony",
  "node_type": "text_encoder",
  "positive": "score_9, score_8_up, score_7_up",
  "negative": "score_4, score_5, score_6",
  "weight": 1.0,
  "tags": ["quality", "pony", "score"],
  "description": "Pony 模型质量标签",
  "syntax": "tag"
}
```

### 注入逻辑

| 步骤 | 操作 |
|------|------|
| 1. 查询 | `search_prompts(category="style", model="pony")` → 返回匹配列表 |
| 2. 选择 | Agent 选择要注入的 Prompt（可多个） |
| 3. 组合 | 按类别排序：quality → style → character → background → detail |
| 4. 注入 | 找到 CLIPTextEncode 节点，修改 `text` 字段 |
| 5. 语法处理 | Pony 用逗号分隔 tag，SD 用自然语言句子 |

### 关键设计决策

1. **不同模型语法差异处理**
   - `syntax` 字段标记：`tag`（逗号分隔）或 `natural_language`（句子）
   - 注入时根据语法类型选择拼接策略

2. **权重语法**
   - 支持 `(tag:1.2)` 或 `[tag:0.8]`
   - Prompt JSON 的 `weight` 字段控制权重

3. **去重和冲突**
   - 注入前去重，保留最高权重
   - 相同 tag 不重复添加

4. **正/负向分离**
   - 每个 Prompt 有 `positive` 和 `negative` 字段
   - 注入时分别追加到对应节点

### 工具设计

| 工具 | 功能 |
|------|------|
| `list_prompts` | 列出所有 Prompt，支持按 category/model/node_type 过滤 |
| `get_prompt` | 获取单个 Prompt 详情 |
| `search_prompts` | 语义搜索 Prompt（按标签、描述） |
| `inject_prompts` | 将选中的 Prompt 注入到工作流的指定节点 |
| `compose_prompt` | 组合多个 Prompt 生成完整提示词（不修改工作流） |

### 实现文件
| 文件 | 改动 |
|------|------|
| `src/services/prompt-database.ts` | **新增**：Prompt 加载、索引、查询、组合 |
| `src/services/workflow-composer.ts` | **修改**：增加 `inject_prompts` 操作 |
| `src/tools/prompt-tools.ts` | **新增**：Prompt 相关工具 |
| `data/prompts/` | **新增**：Prompt 数据库文件 |

---

## 四、其他增强

### 1. 节点信息启动缓存
- 启动时请求 `/object_info`，缓存所有节点 schema
- `get_node_info` 工具直接读缓存，零延迟
- `refresh_nodes()` 工具刷新缓存

### 2. `validate_workflow` 增强
- 保留现有验证逻辑
- 增加 Prompt 节点验证（空提示词警告）
- 增加模型存在性验证

---

## 五、实现优先级

| 优先级 | 功能 | 预计工作量 |
|--------|------|-----------|
| P0 | 模板外挂（JSON 文件化） | 2-3 天 |
| P0 | Session 概念 | 1-2 天 |
| P1 | LoRA 触发词自动注入 | 1-2 天 |
| P1 | 节点信息启动缓存 | 0.5 天 |
| P2 | Prompt 数据库 | 3-5 天 |
| P2 | Prompt 注入系统 | 2-3 天 |

---

## 六、文件变更清单

### 新增文件
```
src/
├── services/
│   ├── template-manager.ts       # 模板管理器
│   ├── lora-metadata.ts          # LoRA 元数据
│   ├── prompt-database.ts        # Prompt 数据库
│   └── node-cache.ts             # 节点信息缓存
├── tools/
│   ├── template-tools.ts         # 模板工具
│   ├── lora-tools.ts             # LoRA 工具
│   ── prompt-tools.ts           # Prompt 工具
data/
├── templates/
│   ├── presets/                  # 预设模板
│   └── custom/                   # 用户模板
├── prompts/                      # Prompt 数据库
├── loras_metadata.json           # LoRA 元数据索引
└── templates.index.json          # 模板索引
```

### 修改文件
```
src/
├── services/
│   ├── workflow-composer.ts      # 适配模板管理器
│   └── workflow-validator.ts     # 增强验证
├── tools/
│   ├── workflow-compose.ts       # 适配新工具
│   └── index.ts                  # 注册新工具
├── index.ts                      # 启动时初始化缓存
└── config.ts                     # 增加数据目录配置
```
