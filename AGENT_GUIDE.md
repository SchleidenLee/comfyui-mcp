# ComfyUI MCP Agent 瀹屾暣浣跨敤鎸囧崡

> **鐗堟湰**: v3.0 | **鏈€鍚庢洿鏂?*: 2026-06-13 | **宸ュ叿鎬绘暟**: 80+

---

## 蹇€熻繛鎺?
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

## 鐩綍

1. [鏍稿績姒傚康](#鏍稿績姒傚康) 鈥?妯℃澘 / Session / 宸ヤ綔娴?2. [宸ュ叿鍒嗙被閫熸煡](#宸ュ叿鍒嗙被閫熸煡) 鈥?鎸夊姛鑳藉垎绫荤殑鍏ㄩ儴宸ュ叿
3. [瀹屾暣宸ヤ綔娴佺▼](#瀹屾暣宸ヤ綔娴佺▼) 鈥?浠庡叆闂ㄥ埌瀹炴垬
4. [modify_workflow 鎿嶄綔璇﹁В](#modify_workflow-鎿嶄綔璇﹁В)
5. [甯歌闂](#甯歌闂)
6. [鏈€浣冲疄璺礭(#鏈€浣冲疄璺?

---

## 鏍稿績姒傚康

### 1. 妯℃澘锛圱emplate锛?
妯℃澘 = **甯﹀弬鏁?schema 鐨勫伐浣滄祦楠ㄦ灦**锛岀敤浜庡揩閫熷垱寤哄彲缂栬緫鐨?Session銆?
| 绫诲瀷 | 璺緞 | 鐢ㄩ€?| 绀轰緥 |
|------|------|------|------|
| 棰勮妯℃澘 | `data/templates/presets/` | 鍐呯疆鍩虹妯℃澘锛堝彧璇伙級 | txt2img, img2img, upscale, inpaint, controlnet, ip_adapter |
| 涓€у寲妯℃澘 | `data/templates/custom/` | 鐢ㄦ埛淇濆瓨鐨勬ā鏉匡紙鍙鍐欙紝鏀寔宓屽瀛愭枃浠跺す锛?| 鐢ㄦ埛閫氳繃 `save_session(..., save_as: "template", path: "pony/lora")` 鍒涘缓 |
| 瀵煎叆妯℃澘 | 閫氳繃 `import_workflow_from_json` | 浠庣綉涓婁笅杞界殑宸ヤ綔娴?JSON 瀵煎叆 | 鑷姩妫€娴?UI/API 鏍煎紡 |

### 2. Session锛堜細璇濓級

Session 鏄?MCP 鏈嶅姟鐨?*鏍稿績姒傚康**锛屼唬琛ㄤ竴涓彲缂栬緫鐨勫伐浣滄祦鍓湰銆?
#### Session 鐢熷懡鍛ㄦ湡

```
鍒涘缓 鈫?缂栬緫 鈫?杩愯 鈫?淇濆瓨 鈫?鍏抽棴
  鈫?     鈫?     鈫?     鈫?     鈫?select  modify  run   save   close
```

#### Session 鐨勪笁绉嶆潵婧?
| 鏉ユ簮 | 宸ュ叿 | 鐢ㄩ€?|
|------|------|------|
| 浠庢ā鏉垮垱寤?| `select_template("txt2img", {...})` | 浠庨浂寮€濮嬫柊宸ヤ綔娴?|
| 浠庡伐浣滄祦鍔犺浇 | `load_workflow("my.json")` | 缁х画缂栬緫宸叉湁宸ヤ綔娴?|
| 浠?JSON 瀵煎叆 | `import_workflow_from_json(json, "name", "session")` | 瀵煎叆缃戜笂涓嬭浇鐨勫伐浣滄祦 |
| 浠庡垎鏀垱寤?| `fork_session("sess_xxx")` | 鍩轰簬鐜版湁 Session 鍒涘缓鏂板垎鏀?|

#### Session 鐘舵€?
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

#### Session 鎸佷箙鍖?
- **瀛樺偍浣嶇疆**: `data/cache/sess_xxx.json`
- **鎸佷箙鍖栨満鍒?*: 姣忔淇敼鑷姩淇濆瓨鍒扮鐩?- **閲嶅惎鎭㈠**: 鏈嶅姟閲嶅惎鍚庤嚜鍔ㄦ仮澶嶆墍鏈?Session
- **娓呯悊鏂瑰紡**: `close_session("sess_xxx")` 鍒犻櫎缂撳瓨鏂囦欢

### 3. 宸ヤ綔娴侊紙Workflow锛?
- `data/workflows/` 鈥?MCP 绠＄悊鐨勬垚鍝佸伐浣滄祦
- ComfyUI 鐢ㄦ埛搴?鈥?Web UI 渚ц竟鏍忓彲瑙佺殑宸ヤ綔娴?- 鍙洿鎺ュ姞杞戒负 Session 缁х画缂栬緫

---

## 宸ュ叿鍒嗙被閫熸煡

> 60+ 宸ュ叿鎸夊姛鑳藉垎绫伙紝鐐瑰嚮宸ュ叿鍚嶆煡鐪嬭缁嗚鏄庛€?
### 涓€銆佹ā鏉夸笌 Session 绠＄悊锛?5 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`list_templates`](#1-list_templates) | 鏃?| 妯℃澘鍒楄〃 | 鍒楀嚭鎵€鏈夊彲鐢ㄦā鏉匡紙棰勮 + 鑷畾涔夛級 |
| [`get_template`](#2-get_template) | `template_id` | 妯℃澘璇︽儏+鍙傛暟 schema | 鏌ョ湅妯℃澘鐨勫弬鏁板畾涔?|
| [`select_template`](#3-select_template) | `template_id`, `params?` | `session_id` | 浠庢ā鏉垮垱寤?Session |
| [`create_workflow`](#4-create_workflow) | `template_id`, `params?` | `session_id` | `select_template` 鐨勫埆鍚?|
| [`load_workflow`](#5-load_workflow) | `workflow_file` | `session_id` | 浠庡伐浣滄祦鏂囦欢鍒涘缓 Session |
| [`import_workflow_from_json`](#import_workflow_from_json) | `workflow_json`, `name`, `save_as`, `path?` | 瀵煎叆缁撴灉 | 浠?JSON 瀛楃涓插鍏ュ伐浣滄祦 |
| [`get_session`](#6-get_session) | `session_id` | Session 鐘舵€?| 鏌ョ湅 Session 璇︽儏 |
| [`list_sessions`](#7-list_sessions) | 鏃?| 娲昏穬 Session 鍒楄〃 | 鍒楀嚭鎵€鏈夋椿璺?Session |
| [`close_session`](#8-close_session) | `session_id` | 鍏抽棴缁撴灉 | 鍏抽棴 Session锛屾竻鐞嗙紦瀛?|
| [`fork_session`](#fork_session) | `session_id`, `name?` | `session_id` | 鍩轰簬鐜版湁 Session 鍒涘缓鍒嗘敮 |
| [`get_session_history`](#get_session_history) | `session_id` | 鍘嗗彶鍒楄〃 | 鏌ョ湅 Session 鎿嶄綔鍘嗗彶 |
| [`undo_modify`](#undo_modify) | `session_id` | 鍥為€€缁撴灉 | 鍥為€€涓婁竴娆′慨鏀?|
| [`diff_sessions`](#diff_sessions) | `session_a`, `session_b` | 宸紓瀵规瘮 | 瀵规瘮涓や釜 Session 鐨勫樊寮?|
| [`save_session`](#save_session) | `session_id`, `name`, `save_as`, `path?` | 淇濆瓨缁撴灉 | 缁熶竴淇濆瓨宸ュ叿锛堟敮鎸佸祵濂楄矾寰勶級 |
| [`refresh_templates`](#12-refresh_templates) | 鏃?| 鍒锋柊缁撴灉 | 閲嶆柊鎵弿妯℃澘鐩綍 |

### 浜屻€佸伐浣滄祦鎿嶄綔锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`modify_workflow`](#9-modify_workflow) | `session_id`, `operations[]` | 淇敼缁撴灉 | 娣诲姞/鍒犻櫎鑺傜偣銆佸缓绔嬭繛鎺ャ€佹櫤鑳芥彃鍏?|
| [`run_workflow`](#10-run_workflow) | `session_id` | `prompt_id` | 杩愯 Session 瀵瑰簲鐨勫伐浣滄祦 |
| [`validate_workflow`](#11-validate_workflow) | `session_id` 鎴?`workflow` JSON锛堜簩閫変竴锛?| 楠岃瘉缁撴灉+淇寤鸿 | 鎵ц鍓嶆鏌ュ伐浣滄祦瀹屾暣鎬э紝杩斿洖閿欒+鑷姩淇寤鸿 |
| [`refresh_templates`](#12-refresh_templates) | 鏃?| 鍒锋柊缁撴灉 | 閲嶆柊鎵弿妯℃澘鐩綍 |

### 涓夈€佹墽琛屼笌鐩戞帶锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`enqueue_workflow`](#13-enqueue_workflow) | `workflow` JSON | `prompt_id`, 闃熷垪浣嶇疆 | 鐩存帴鎻愪氦瀹屾暣 JSON 宸ヤ綔娴?|
| [`get_job_status`](#14-get_job_status) | `prompt_id` | 杩愯鐘舵€?| 鏌ョ湅鍗曚釜浠诲姟鐘舵€?|
| [`get_history`](#15-get_history) | `prompt_id?` | 鎵ц鍘嗗彶+杈撳嚭 | 鏌ョ湅浠诲姟鎵ц缁撴灉鍜岄敊璇?|
| [`get_queue`](#16-get_queue) | 鏃?| 闃熷垪鐘舵€?| 鏌ョ湅褰撳墠杩愯鍜屽緟鎵ц浠诲姟 |
| [`cancel_job`](#17-cancel_job) | `prompt_id?` | 鍙栨秷缁撴灉 | 鍙栨秷姝ｅ湪杩愯鐨勪换鍔?|
| [`cancel_queued_job`](#18-cancel_queued_job) | `prompt_id` | 鍙栨秷缁撴灉 | 鍙栨秷闃熷垪涓殑寰呮墽琛屼换鍔?|
| [`clear_queue`](#19-clear_queue) | 鏃?| 娓呴櫎缁撴灉 | 娓呯┖鎵€鏈夊緟鎵ц浠诲姟 |
| [`view_image`](#20-view_image) | `asset_id` | 鍥剧墖 | 鏌ョ湅鐢熸垚鐨勫浘鐗?|

### 鍥涖€佸浘鐗囦笌璧勪骇绠＄悊锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_image`](#21-get_image) | `filename`, `type?`, `subfolder?`, `save_dir?` | 鍥剧墖+淇濆瓨璺緞 | 浠?ComfyUI 鑾峰彇杈撳嚭鍥剧墖 |
| [`list_assets`](#22-list_assets) | `limit?`, `since?` | 璧勪骇鍒楄〃 | 鍒楀嚭鏈€杩戠敓鎴愮殑璧勪骇 |
| [`get_asset_metadata`](#23-get_asset_metadata) | `asset_id` | 璧勪骇鍏冩暟鎹?宸ヤ綔娴佸揩鐓?| 鏌ョ湅璧勪骇鐨勪骇鐢熷弬鏁?|
| [`regenerate`](#24-regenerate) | `asset_id`, `overrides?`, `disable_random_seed?` | `prompt_id` | 鐢ㄧ浉鍚屽弬鏁伴噸鏂扮敓鎴?|
| [`upload_image`](#25-upload_image) | `source_path`, `filename?` | 涓婁紶鏂囦欢鍚?| 涓婁紶鍥剧墖鍒?ComfyUI input 鐩綍 |
| [`upload_video`](#26-upload_video) | `source_path`, `filename?` | 涓婁紶鏂囦欢鍚?| 涓婁紶瑙嗛鍒?ComfyUI input 鐩綍 |
| [`upload_audio`](#27-upload_audio) | `source_path`, `filename?` | 涓婁紶鏂囦欢鍚?| 涓婁紶闊抽鍒?ComfyUI input 鐩綍 |
| [`workflow_from_image`](#28-workflow_from_image) | `image_path` | 宸ヤ綔娴?JSON | 浠?PNG 鎻愬彇宓屽叆鐨勫伐浣滄祦 |

### 浜斻€佸伐浣滄祦搴撶鐞嗭紙4 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`list_workflows`](#29-list_workflows) | 鏃?| 宸ヤ綔娴佹枃浠跺垪琛?| 鍒楀嚭 ComfyUI 鐢ㄦ埛搴撲腑鐨勫伐浣滄祦 |
| [`get_workflow`](#30-get_workflow) | `filename`, `format?` | 宸ヤ綔娴?JSON | 鍔犺浇宸蹭繚瀛樼殑宸ヤ綔娴?|
| [`save_workflow`](#31-save_workflow) | `filename`, `workflow` JSON | 淇濆瓨缁撴灉 | 淇濆瓨鍒?ComfyUI 鐢ㄦ埛搴?|
| [`analyze_workflow`](#32-analyze_workflow) | `filename`, `view?`, `section?` | 缁撴瀯鍖栧垎鏋?| 鍒嗘瀽宸ヤ綔娴佺粨鏋勶紙AI 鍙嬪ソ锛?|

### 鍏€佸彲瑙嗗寲涓?DSL锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`visualize_workflow`](#33-visualize_workflow) | `workflow` JSON, `show_values?`, `direction?` | Mermaid 鍥?| 灏嗗伐浣滄祦杞负娴佺▼鍥?|
| [`visualize_workflow_hierarchical`](#34-visualize_workflow_hierarchical) | `workflow`, `view?`, `section?` | Mermaid 鍥?鏂囨湰 | 鍒嗗眰鍙鍖栧ぇ鍨嬪伐浣滄祦 |
| [`mermaid_to_workflow`](#35-mermaid_to_workflow) | `mermaid` 鏂囨湰 | JSON 宸ヤ綔娴?| Mermaid 鍥捐浆宸ヤ綔娴?|
| [`workflow_to_dsl`](#36-workflow_to_dsl) | `workflow` JSON | DSL 鏂囨湰 | 宸ヤ綔娴佽浆浜虹被鍙 DSL |
| [`dsl_to_workflow`](#37-dsl_to_workflow) | `dsl` 鏂囨湰 | JSON 宸ヤ綔娴?| DSL 杞伐浣滄祦 JSON |

### 涓冦€佽妭鐐逛俊鎭紙1 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_node_info`](#38-get_node_info) | `node_type?` | 鑺傜偣瀹氫箟 | 鏌ヨ鑺傜偣杈撳叆杈撳嚭 schema |

### 鍏€佹ā鍨嬬鐞嗭紙5 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`search_models`](#39-search_models) | `query`, `filter?`, `limit?` | 妯″瀷鍒楄〃 | 鎼滅储 HuggingFace 妯″瀷 |
| [`download_model`](#40-download_model) | `url`, `target_subfolder`, `filename?`, `auth?` | 淇濆瓨璺緞 | 涓嬭浇妯″瀷鍒版湰鍦?|
| [`download_civitai_model`](#41-download_civitai_model) | `target_subfolder`, `model_id?`, `model_version_id?`, `filename?` | 淇濆瓨璺緞 | 浠?CivitAI 涓嬭浇妯″瀷 |
| [`list_local_models`](#42-list_local_models) | `model_type?` | 鏈湴妯″瀷鍒楄〃 | 鍒楀嚭宸插畨瑁呯殑妯″瀷 |
| [`remove_model`](#43-remove_model) | `path` | 鍒犻櫎缁撴灉 | 鍒犻櫎鏈湴妯″瀷鏂囦欢 |

### 涔濄€佽嚜瀹氫箟鑺傜偣绠＄悊锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`search_custom_nodes`](#44-search_custom_nodes) | `query`, `limit?`, `page?` | 鑺傜偣鍖呭垪琛?| 鎼滅储 ComfyUI Registry |
| [`get_node_pack_details`](#45-get_node_pack_details) | `id` | 鑺傜偣鍖呰鎯?| 鏌ョ湅鑺傜偣鍖呰缁嗕俊鎭?|
| [`install_custom_node`](#46-install_custom_node) | `id`, `source?`, `version?`, `ref?`, `mode?`, `channel?`, `useCmCli?` | 瀹夎缁撴灉 | 瀹夎鑷畾涔夎妭鐐?|
| [`update_custom_node`](#47-update_custom_node) | `id`, `mode?`, `channel?`, `useCmCli?` | 鏇存柊缁撴灉 | 鏇存柊鑷畾涔夎妭鐐?|
| [`reinstall_custom_node`](#48-reinstall_custom_node) | `id`, `version?`, `mode?`, `channel?`, `useCmCli?` | 閲嶈缁撴灉 | 閲嶆柊瀹夎鑷畾涔夎妭鐐?|
| [`fix_custom_node`](#49-fix_custom_node) | `id`, `mode?`, `channel?`, `useCmCli?` | 淇缁撴灉 | 淇鑷畾涔夎妭鐐逛緷璧?|
| [`list_installed_nodes`](#50-list_installed_nodes) | `mode?`, `useCmCli?` | 宸插畨瑁呰妭鐐瑰垪琛?| 鍒楀嚭宸插畨瑁呯殑鑺傜偣鍖?|
| [`sync_node_dependencies`](#51-sync_node_dependencies) | 鏃?| 鍚屾缁撴灉 | 鍚屾鎵€鏈夎妭鐐?Python 渚濊禆 |
| [`list_node_snapshots`](#52-list_node_snapshots) | 鏃?| 蹇収鍒楄〃 | 鍒楀嚭鑺傜偣蹇収 |

### 鍗併€佽妭鐐瑰揩鐓т笌浜屽垎鎺掓煡锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`save_node_snapshot`](#53-save_node_snapshot) | `name?` | 蹇収缁撴灉 | 淇濆瓨褰撳墠鑺傜偣鐘舵€佸揩鐓?|
| [`restore_node_snapshot`](#54-restore_node_snapshot) | `name` | 鎭㈠缁撴灉 | 鎭㈠鑺傜偣蹇収 |
| [`bisect_start`](#55-bisect_start) | 鏃?| 浜屽垎寮€濮嬬粨鏋?| 寮€濮嬩簩鍒嗘帓鏌ユ晠闅滆妭鐐?|
| [`bisect_good`](#56-bisect_good) | 鏃?| 鎺掓煡缁撴灉 | 鏍囪褰撳墠鑺傜偣闆嗕负姝ｅ父 |
| [`bisect_bad`](#57-bisect_bad) | 鏃?| 鎺掓煡缁撴灉 | 鏍囪褰撳墠鑺傜偣闆嗕负寮傚父 |

### 鍗佷竴銆佽妭鐐瑰紑鍙戜笌楠岃瘉锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`scaffold_custom_node`](#58-scaffold_custom_node) | `name`, `display_name`, `category?`, `description?`, `publisher_id?`, `with_frontend?`, `with_ci?`, `overwrite?` | 鑴氭墜鏋剁粨鏋?| 鍒涘缓鑷畾涔夎妭鐐瑰紑鍙戞ā鏉?|
| [`verify_custom_node`](#59-verify_custom_node) | `name?`, `class_types?`, `restart?` | 楠岃瘉缁撴灉 | 楠岃瘉鑷畾涔夎妭鐐规槸鍚︽甯稿姞杞?|
| [`publish_custom_node`](#60-publish_custom_node) | `name?`, `path?` | 鍙戝竷缁撴灉 | 鍙戝竷鑺傜偣鍒?Comfy Registry |

### 鍗佷簩銆佽瘖鏂笌鏃ュ織锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_logs`](#61-get_logs) | `max_lines?`, `keyword?` | 鏃ュ織鏂囨湰 | 鑾峰彇 ComfyUI 杩愯鏃ュ織 |
| [`get_history`](#62-get_history) | `prompt_id?` | 鎵ц鍘嗗彶 | 鏌ョ湅浠诲姟鎵ц璇︽儏锛堝惈閿欒鍫嗘爤锛?|

### 鍗佷笁銆佺郴缁熶笌鍐呭瓨绠＄悊锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_system_stats`](#63-get_system_stats) | 鏃?| 绯荤粺淇℃伅 | 鏌ョ湅 GPU 鏄惧瓨銆丆omfyUI 鐗堟湰绛?|
| [`clear_vram`](#64-clear_vram) | `unload_models?`, `free_memory?` | 娓呯悊缁撴灉 | 閲婃斁 GPU 鏄惧瓨 |
| [`get_embeddings`](#65-get_embeddings) | 鏃?| 宓屽叆妯″瀷鍒楄〃 | 鍒楀嚭宸插畨瑁呯殑 textual inversion 宓屽叆 |
| [`health_check`](#66-health_check) | `model_categories?`, `recent_errors?` | 鍋ュ悍鎶ュ憡 | 鍏ㄩ潰璇婃柇 ComfyUI 鐘舵€?|

### 鍗佸洓銆佸伐浣滄祦渚濊禆锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`extract_workflow_dependencies`](#67-extract_workflow_dependencies) | `workflow` JSON | 渚濊禆鍒嗘瀽 | 鍒嗘瀽宸ヤ綔娴侀渶瑕佺殑鑷畾涔夎妭鐐?|
| [`install_workflow_dependencies`](#68-install_workflow_dependencies) | `workflow` JSON | 瀹夎缁撴灉 | 鑷姩瀹夎宸ヤ綔娴佺己澶辩殑鑺傜偣 |

### 鍗佷簲銆侀粯璁ゅ€间笌鐢熸垚缁熻锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_defaults`](#69-get_defaults) | 鏃?| 榛樿鍊奸厤缃?| 鏌ョ湅褰撳墠榛樿鍙傛暟 |
| [`set_defaults`](#70-set_defaults) | `values`, `persist?` | 鏇存柊缁撴灉 | 璁剧疆榛樿鍙傛暟 |
| [`suggest_settings`](#71-suggest_settings) | `model_family?`, `lora_hash?`, `search?`, `limit?` | 鎺ㄨ崘鍙傛暟 | 鍩轰簬鍘嗗彶鏁版嵁鎺ㄨ崘鏈€浣冲弬鏁?|
| [`generation_stats`](#72-generation_stats) | `model_family?` | 缁熻淇℃伅 | 鏌ョ湅鐢熸垚鍘嗗彶缁熻 |

### 鍗佸叚銆佸浘鐗囪浆鎹笌涓婁紶锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`convert_image`](#73-convert_image) | `asset_id?`, `path?`, `format`, `quality?`, `progressive?`, `lossless?`, `effort?`, `out_path?` | 杞崲缁撴灉 | 杞崲鍥剧墖鏍煎紡 |
| [`upload_output`](#74-upload_output) | `asset_id?`, `path?`, `destination` | 涓婁紶缁撴灉 | 涓婁紶鐢熸垚缁撴灉鍒颁簯瀛樺偍 |
| [`list_output_images`](#75-list_output_images) | `limit?`, `pattern?` | 鍥剧墖鍒楄〃 | 鍒楀嚭 ComfyUI 杈撳嚭鐩綍鐨勫浘鐗?|

### 鍗佷竷銆佸揩鎹风敓鎴愶紙3 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`generate_image`](#76-generate_image) | `prompt`, `negative_prompt?`, `width?`, `height?`, `steps?`, `cfg?`, `sampler?`, `scheduler?`, `seed?`, `checkpoint?`, `batch_size?` | `prompt_id` | 蹇嵎鏂囩敓鍥撅紙鑷姩鏋勫缓宸ヤ綔娴侊級 |
| [`generate_with_controlnet`](#77-generate_with_controlnet) | `prompt`, `control_image`, `controlnet_model?`, `strength?`, + 閫氱敤鍙傛暟 | `prompt_id` | ControlNet 鏉′欢鐢熸垚 |
| [`generate_with_ip_adapter`](#78-generate_with_ip_adapter) | `prompt`, `reference_image`, `weight?`, `preset?`, + 閫氱敤鍙傛暟 | `prompt_id` | IP-Adapter 鍙傝€冨浘鐢熸垚 |

### 鍗佸叓銆佸伐浣滅┖闂翠笌鐜锛? 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`get_workspace`](#79-get_workspace) | 鏃?| 宸ヤ綔绌洪棿淇℃伅 | 鏌ョ湅褰撳墠 ComfyUI 瀹夎璺緞 |
| [`set_default_workspace`](#80-set_default_workspace) | `path` | 璁剧疆缁撴灉 | 璁剧疆榛樿宸ヤ綔绌洪棿 |
| [`list_workspaces`](#81-list_workspaces) | 鏃?| 宸ヤ綔绌洪棿鍒楄〃 | 鍒楀嚭妫€娴嬪埌鐨?ComfyUI 瀹夎 |
| [`get_environment`](#82-get_environment) | 鏃?| 鐜淇℃伅 | 鏌ョ湅 ComfyUI 鐜璇︽儏 |

### 鍗佷節銆佽繘绋嬫帶鍒讹紙3 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`stop_comfyui`](#83-stop_comfyui) | 鏃?| 鍋滄缁撴灉 | 鍋滄 ComfyUI 杩涚▼ |
| [`start_comfyui`](#84-start_comfyui) | 鏃?| 鍚姩缁撴灉 | 鍚姩 ComfyUI |
| [`restart_comfyui`](#85-restart_comfyui) | 鏃?| 閲嶅惎缁撴灉 | 閲嶅惎 ComfyUI |

### 浜屽崄銆佸叾浠栧伐鍏凤紙4 涓級

| 宸ュ叿 | 鍙傛暟 | 杩斿洖 | 鐢ㄩ€?|
|------|------|------|------|
| [`apply_manifest`](#86-apply_manifest) | `manifest?`, `path?` | 搴旂敤缁撴灉 | 搴旂敤 ComfyUI 閰嶇疆娓呭崟 |
| [`install_comfyui`](#87-install_comfyui) | `target_path`, `skip_manager?`, `use_uv?`, `version?` | 瀹夎鎶ュ憡 | 鍏ㄦ柊瀹夎 ComfyUI |
| [`update_comfyui`](#88-update_comfyui) | 鏃?| 鏇存柊缁撴灉 | 鏇存柊 ComfyUI 鏍稿績 |
| [`update_all`](#89-update_all) | 鏃?| 鏇存柊缁撴灉 | 鏇存柊鎵€鏈夎嚜瀹氫箟鑺傜偣 |

---

## 宸ュ叿璇︾粏璇存槑

### 1. list_templates

鍒楀嚭鎵€鏈夊彲鐢ㄦā鏉匡紙棰勮 + 鑷畾涔夛級銆?
**鍙傛暟**: 鏃?
**杩斿洖**:
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

鏌ョ湅妯℃澘鐨勫弬鏁板畾涔夈€?
**鍙傛暟**:
- `template_id` (蹇呴渶): 妯℃澘 ID

**杩斿洖**:
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

浠庢ā鏉垮垱寤?Session銆?
**鍙傛暟**:
- `template_id` (蹇呴渶): 妯℃澘 ID
- `params` (鍙€?: 妯℃澘鍙傛暟锛岃鐩栭粯璁ゅ€?
**杩斿洖**:
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

`select_template` 鐨勫埆鍚嶏紝鍏煎鏃х増 API銆?
**鍙傛暟**:
- `template_id` (蹇呴渶)
- `params` (鍙€?

---

### 5. load_workflow

浠庡伐浣滄祦鏂囦欢鍒涘缓 Session銆?
**鍙傛暟**:
- `workflow_file` (蹇呴渶): 宸ヤ綔娴佹枃浠跺悕锛堜粠 `data/workflows/` 鎴?ComfyUI 鐢ㄦ埛搴擄級

**杩斿洖**:
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

鏌ョ湅 Session 璇︽儏銆?
**鍙傛暟**:
- `session_id` (蹇呴渶)

---

### 7. list_sessions

鍒楀嚭鎵€鏈夋椿璺?Session銆?
**鍙傛暟**: 鏃?
---

### 8. close_session

鍏抽棴 Session锛屾竻鐞嗙紦瀛樻枃浠躲€?
**鍙傛暟**:
- `session_id` (蹇呴渶)

---

### save_session

缁熶竴淇濆瓨宸ュ叿锛屾浛浠?`save_session_as_template` 鍜?`save_session_as_workflow`銆?
**鍙傛暟**:
- `session_id` (蹇呴渶): Session ID
- `name` (蹇呴渶): 淇濆瓨鍚嶇О
- `save_as` (蹇呴渶): `"template"` 鎴?`"workflow"`
- `path` (鍙€?: 宓屽瀛愭枃浠跺す璺緞锛堝 `"pony/lora"`锛夛紝鑷姩鍒涘缓涓嶅瓨鍦ㄧ殑鐩綍
- `sync_to_webui` (鍙€?: 濡傛灉 true锛屽悓鏃跺悓姝ュ埌 ComfyUI WebUI 鐢ㄦ埛搴擄紙浠?workflow 妯″紡锛?
**绀轰緥**:
```json
// 淇濆瓨鍒?templates/custom/pony/lora_v1.json
save_session("sess_xxx", "lora_v1", { save_as: "template", path: "pony" })

// 淇濆瓨鍒?workflows/鏈€缁堢増.json
save_session("sess_xxx", "鏈€缁堢増", { save_as: "workflow" })
```

---

### import_workflow_from_json

浠?JSON 瀛楃涓插鍏ュ伐浣滄祦锛堟敮鎸佺綉涓婁笅杞界殑 UI/API 鏍煎紡锛夈€?
**鍙傛暟**:
- `workflow_json` (蹇呴渶): 瀹屾暣宸ヤ綔娴?JSON 瀛楃涓?- `name` (蹇呴渶): 瀵煎叆鍚嶇О
- `save_as` (蹇呴渶): `"session"` / `"template"` / `"workflow"`
- `path` (鍙€?: 瀛愭枃浠跺す璺緞

**绀轰緥**:
```json
import_workflow_from_json(json_string, "涓嬭浇鐨凩oRA宸ヤ綔娴?, "session")
// 鈫?杩斿洖 session_id锛屽彲鐩存帴缂栬緫
```

---

### fork_session

鍩轰簬鐜版湁 Session 鍒涘缓鍒嗘敮锛堜笉褰卞搷鍘?Session锛夈€?
**鍙傛暟**:
- `session_id` (蹇呴渶): 婧?Session ID
- `name` (鍙€?: 鍒嗘敮鍚嶇О

**绀轰緥**:
```json
fork_session("sess_abc123", "v2灏濊瘯")
// 鈫?杩斿洖鏂扮殑 session_id
```

---

### get_session_history

鏌ョ湅 Session 鐨勬搷浣滃巻鍙层€?
**鍙傛暟**:
- `session_id` (蹇呴渶)

**杩斿洖**:
```
## Session History (3 operations)

1. [10:00:00] select_template txt2img
2. [10:05:00] add_node LoraLoader; connect 1
3. [10:10:00] set_input 3
```

---

### undo_modify

鍥為€€涓婁竴娆′慨鏀癸紙闇€瑕佷箣鍓嶆湁淇敼鎿嶄綔锛夈€?
**鍙傛暟**:
- `session_id` (蹇呴渶)

---

### diff_sessions

瀵规瘮涓や釜 Session 鐨勫樊寮傘€?
**鍙傛暟**:
- `session_a` (蹇呴渶)
- `session_b` (蹇呴渶)

**杩斿洖**: 鑺傜偣澧炲垹鏀瑰姣旀姤鍛?
---

### 9. modify_workflow

淇敼 Session 瀵瑰簲鐨勫伐浣滄祦銆傛敮鎸?5 绉嶆搷浣溿€?
**鍙傛暟**:
- `session_id` (蹇呴渶)
- `operations[]` (蹇呴渶): 鎿嶄綔鏁扮粍

**鎿嶄綔绫诲瀷**:
| op | 鍙傛暟 | 璇存槑 |
|----|------|------|
| `set_input` | `node_id`, `input_name`, `value` | 淇敼鑺傜偣鍙傛暟 |
| `add_node` | `class_type`, `inputs?`, `id?`, `insert_between?` | 娣诲姞鏂拌妭鐐癸紙鏀寔鏅鸿兘鎻掑叆锛?|
| `remove_node` | `node_id` | 鍒犻櫎鑺傜偣 |
| `connect` | `source_id`, `output_index`, `target_id`, `input_name` | 寤虹珛杩炴帴 |

**杩斿洖**:
```json
{
  "success": true,
  "added_ids": ["8"],
  "message": "Session sess_abc123 modified. Use run_workflow to execute."
}
```

---

### 10. run_workflow

杩愯 Session 瀵瑰簲鐨勫伐浣滄祦銆?
**鍙傛暟**:
- `session_id` (蹇呴渶)

**杩斿洖**:
```json
{
  "prompt_id": "prompt_xyz789",
  "queue_position": 1,
  "status": "queued"
}
```

---

### 11. validate_workflow

楠岃瘉宸ヤ綔娴佸畬鏁存€э紙鎵ц鍓嶅繀鍋氾級銆傛瘡涓敊璇兘闄勫甫**淇寤鸿**鍜?*鑷姩淇鎿嶄綔**銆?
**鍙傛暟**:
- `session_id` (鍙€?: Session ID锛堟帹鑽愶紝鐩存帴浼?ID 涓嶇敤浼?JSON锛?- `workflow` (鍙€?: 瀹屾暣 JSON 宸ヤ綔娴侊紙涓?session_id 浜岄€変竴锛?
**杩斿洖锛堟垚鍔燂級**:
```json
{
  "valid": true,
  "message": "Workflow is valid"
}
```

**杩斿洖锛堝け璐ワ紝鍚慨澶嶅缓璁級**:
```
## Workflow has 1 error(s) and 0 warning(s)

### Errors
- **Node 8 (KSampler)**: Missing required input "model"
  >  Suggestion: Connect node 1 output 0 (MODEL) to node 8 input "model"
  > 馃敡 Auto-fix: {"op":"connect","source_id":"1","output_index":0,"target_id":"8","input_name":"model"}
```

**鑷姩淇娴佺▼**:
1. `validate_workflow("sess_xxx")` 鈫?鍙戠幇閿欒 + 鑾峰彇 `auto_fix` 鎿嶄綔
2. `modify_workflow("sess_xxx", [auto_fix])` 鈫?搴旂敤淇
3. `validate_workflow("sess_xxx")` 鈫?鍐嶆楠岃瘉纭閫氳繃
4. `run_workflow("sess_xxx")` 鈫?鎵ц

---

### 12. refresh_templates

閲嶆柊鎵弿妯℃澘鐩綍锛堟坊鍔犳柊妯℃澘鍚庝娇鐢級銆?
**鍙傛暟**: 鏃?
---

### 13. enqueue_workflow

鐩存帴鎻愪氦瀹屾暣 JSON 宸ヤ綔娴侊紙楂樼骇妯″紡锛夈€?
**鍙傛暟**:
- `workflow` (蹇呴渶): ComfyUI API 鏍煎紡宸ヤ綔娴?JSON
- `disable_random_seed` (鍙€?: 濡傛灉 true锛屼笉闅忔満鍖栫瀛?
**杩斿洖**:
```json
{
  "status": "enqueued",
  "prompt_id": "prompt_abc",
  "queue_remaining": 0
}
```

---

### 14. get_job_status

鏌ョ湅鍗曚釜浠诲姟鐘舵€併€?
**鍙傛暟**:
- `prompt_id` (蹇呴渶)

---

### 15. get_history

鏌ョ湅浠诲姟鎵ц缁撴灉鍜岄敊璇鎯咃紙鍚?Python traceback锛夈€?
**鍙傛暟**:
- `prompt_id` (鍙€?: 鐪佺暐鍒欒繑鍥炴渶杩戜竴娆℃墽琛?
---

### 16. get_queue

鏌ョ湅褰撳墠杩愯鍜屽緟鎵ц浠诲姟銆?
**鍙傛暟**: 鏃?
---

### 17. cancel_job

鍙栨秷姝ｅ湪杩愯鐨勪换鍔°€?
**鍙傛暟**:
- `prompt_id` (鍙€?: 鐪佺暐鍒欏彇娑堝綋鍓嶈繍琛岀殑浠诲姟

---

### 18. cancel_queued_job

鍙栨秷闃熷垪涓殑寰呮墽琛屼换鍔°€?
**鍙傛暟**:
- `prompt_id` (蹇呴渶)

---

### 19. clear_queue

娓呯┖鎵€鏈夊緟鎵ц浠诲姟銆?
**鍙傛暟**: 鏃?
---

### 20. view_image

鏌ョ湅鐢熸垚鐨勫浘鐗囷紙閫氳繃 asset_id锛夈€?
**鍙傛暟**:
- `asset_id` (蹇呴渶)

**杩斿洖**: 鍐呰仈鍥剧墖鍐呭鍧?
---

### 21. get_image

浠?ComfyUI 鑾峰彇杈撳嚭鍥剧墖骞朵繚瀛樺埌鏈湴銆?
**鍙傛暟**:
- `filename` (蹇呴渶): 杈撳嚭鏂囦欢鍚?- `type` (鍙€?: `output` / `input` / `temp`锛堥粯璁?`output`锛?- `subfolder` (鍙€?: 瀛愭枃浠跺す
- `save_dir` (鍙€?: 淇濆瓨鐩綍

---

### 22. list_assets

鍒楀嚭鏈€杩戠敓鎴愮殑璧勪骇锛堝浘鐗?瑙嗛/闊抽锛夈€?
**鍙傛暟**:
- `limit` (鍙€?: 鏈€澶ц繑鍥炴暟閲?- `since` (鍙€?: ISO 鏃堕棿鎴筹紝鍙繑鍥炴鏃堕棿涔嬪悗鐨勮祫浜?
---

### 23. get_asset_metadata

鏌ョ湅璧勪骇鐨勪骇鐢熷弬鏁帮紙瀹屾暣宸ヤ綔娴佸揩鐓э級銆?
**鍙傛暟**:
- `asset_id` (蹇呴渶)

---

### 24. regenerate

鐢ㄧ浉鍚屽弬鏁伴噸鏂扮敓鎴愶紙鍙鐩栭儴鍒嗗弬鏁帮級銆?
**鍙傛暟**:
- `asset_id` (蹇呴渶)
- `overrides` (鍙€?: 鍙傛暟瑕嗙洊锛屽 `{"seed": 123, "cfg": 8.0}`
- `disable_random_seed` (鍙€?: 濡傛灉 true锛屼繚鎸佸師绉嶅瓙

---

### 25. upload_image

涓婁紶鍥剧墖鍒?ComfyUI `input/` 鐩綍銆?
**鍙傛暟**:
- `source_path` (蹇呴渶): 鏈湴鏂囦欢缁濆璺緞
- `filename` (鍙€?: 瑕嗙洊鏂囦欢鍚?
---

### 26. upload_video

涓婁紶瑙嗛鍒?ComfyUI `input/` 鐩綍锛堟敮鎸?.mp4, .mov, .webm, .avi, .mkv, .m4v锛夈€?
---

### 27. upload_audio

涓婁紶闊抽鍒?ComfyUI `input/` 鐩綍锛堟敮鎸?.wav, .mp3, .flac, .ogg, .m4a, .aac锛夈€?
---

### 28. workflow_from_image

浠?ComfyUI 鐢熸垚鐨?PNG 鎻愬彇宓屽叆鐨勫伐浣滄祦鍏冩暟鎹€?
**鍙傛暟**:
- `image_path` (蹇呴渶): PNG 鏂囦欢缁濆璺緞

---

### 29. list_workflows

鍒楀嚭 ComfyUI 鐢ㄦ埛搴撲腑鐨勫伐浣滄祦锛圵eb UI 渚ц竟鏍忓彲瑙侊級銆?
**鍙傛暟**: 鏃?
---

### 30. get_workflow

鍔犺浇宸蹭繚瀛樼殑宸ヤ綔娴?JSON銆?
**鍙傛暟**:
- `filename` (蹇呴渶)
- `format` (鍙€?: `api` / `ui`锛堥粯璁?`api`锛?
---

### 31. save_workflow

淇濆瓨鍒?ComfyUI 鐢ㄦ埛搴撱€?
**鍙傛暟**:
- `filename` (蹇呴渶)
- `workflow` (蹇呴渶): API 鎴?UI 鏍煎紡 JSON

---

### 32. analyze_workflow

缁撴瀯鍖栧垎鏋愬伐浣滄祦锛圓I 鍙嬪ソ锛屼笉杩斿洖瀹屾暣 JSON锛夈€?
**鍙傛暟**:
- `filename` (蹇呴渶)
- `view` (鍙€?: `summary` / `overview` / `detail` / `list` / `flat`锛堥粯璁?`summary`锛?- `section` (鍙€?: 鐢ㄤ簬 `detail` 瑙嗗浘鐨勫垎鍖哄悕

---

### 33. visualize_workflow

灏嗗伐浣滄祦杞负 Mermaid 娴佺▼鍥俱€?
**鍙傛暟**:
- `workflow` (蹇呴渶): JSON 宸ヤ綔娴?- `show_values` (鍙€?: 鏄剧ず鍙傛暟鍊硷紙榛樿 true锛?- `direction` (鍙€?: `LR` / `TB`锛堥粯璁?`LR`锛?
---

### 34. visualize_workflow_hierarchical

鍒嗗眰鍙鍖栧ぇ鍨嬪伐浣滄祦锛?0+ 鑺傜偣锛夈€?
**鍙傛暟**:
- `workflow` (蹇呴渶)
- `view` (鍙€?: `overview` / `detail` / `list` / `summary`
- `section` (鍙€?: 鐢ㄤ簬 `detail` 瑙嗗浘
- `show_values` (鍙€?
- `direction` (鍙€?

---

### 35. mermaid_to_workflow

Mermaid 鍥捐浆 ComfyUI 宸ヤ綔娴?JSON銆?
**鍙傛暟**:
- `mermaid` (蹇呴渶): Mermaid 娴佺▼鍥炬枃鏈?
---

### 36. workflow_to_dsl

宸ヤ綔娴佽浆浜虹被鍙 DSL銆?
**鍙傛暟**:
- `workflow` (蹇呴渶)

---

### 37. dsl_to_workflow

DSL 杞伐浣滄祦 JSON銆?
**鍙傛暟**:
- `dsl` (蹇呴渶)

---

### 38. get_node_info

鏌ヨ鑺傜偣杈撳叆杈撳嚭 schema銆?
**鍙傛暟**:
- `node_type` (鍙€?: 鑺傜偣绫诲瀷杩囨护锛堟ā绯婂尮閰嶏級

**杩斿洖**:
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

鎼滅储 HuggingFace 妯″瀷銆?
**鍙傛暟**:
- `query` (蹇呴渶)
- `filter` (鍙€?: 濡?`diffusers`
- `limit` (鍙€?: 榛樿 10

---

### 40. download_model

涓嬭浇妯″瀷鍒版湰鍦般€?
**鍙傛暟**:
- `url` (蹇呴渶)
- `target_subfolder` (蹇呴渶): `checkpoints` / `loras` / `vae` / `controlnet` / `embeddings` / `clip` / `diffusion_models` / `text_encoders` / `unet`
- `filename` (鍙€?
- `auth` (鍙€?: 璁よ瘉淇℃伅锛坆earer / basic / header / query / s3锛?
---

### 41. download_civitai_model

浠?CivitAI 涓嬭浇妯″瀷銆?
**鍙傛暟**:
- `target_subfolder` (蹇呴渶)
- `model_id` (鍙€?
- `model_version_id` (鍙€?
- `filename` (鍙€?

---

### 42. list_local_models

鍒楀嚭宸插畨瑁呯殑妯″瀷銆?
**鍙傛暟**:
- `model_type` (鍙€?: 鎸夌被鍨嬭繃婊?
---

### 43. remove_model

鍒犻櫎鏈湴妯″瀷鏂囦欢銆?
**鍙傛暟**:
- `path` (蹇呴渶): 鐩稿浜?`models/` 鐨勮矾寰?
---

### 44. search_custom_nodes

鎼滅储 ComfyUI Registry銆?
**鍙傛暟**:
- `query` (蹇呴渶)
- `limit` (鍙€?: 榛樿 10
- `page` (鍙€?: 榛樿 1

---

### 45. get_node_pack_details

鏌ョ湅鑺傜偣鍖呰缁嗕俊鎭€?
**鍙傛暟**:
- `id` (蹇呴渶): 鑺傜偣鍖?ID

---

### 46. install_custom_node

瀹夎鑷畾涔夎妭鐐广€?
**鍙傛暟**:
- `id` (蹇呴渶): 娉ㄥ唽琛?ID / git URL / 鑺傜偣鍖呭悕
- `source` (鍙€?: `registry` / `git` / `auto`锛堥粯璁?`auto`锛?- `version` (鍙€?: 鐗堟湰鍙?- `ref` (鍙€?: git ref
- `mode` (鍙€?: `remote` / `local` / `cache`
- `channel` (鍙€?: 棰戦亾鍚?- `useCmCli` (鍙€?: 寮哄埗浣跨敤 cm-cli

---

### 47. update_custom_node

鏇存柊鑷畾涔夎妭鐐癸紙浼?`all` 鏇存柊鍏ㄩ儴锛夈€?
**鍙傛暟**:
- `id` (蹇呴渶)
- `mode`, `channel`, `useCmCli` (鍙€?

---

### 48. reinstall_custom_node

閲嶆柊瀹夎鑷畾涔夎妭鐐广€?
---

### 49. fix_custom_node

淇鑷畾涔夎妭鐐逛緷璧栥€?
---

### 50. list_installed_nodes

鍒楀嚭宸插畨瑁呯殑鑺傜偣鍖呫€?
**鍙傛暟**:
- `mode` (鍙€?: `default` / `imported`
- `useCmCli` (鍙€?

---

### 51. sync_node_dependencies

鍚屾鎵€鏈夎妭鐐?Python 渚濊禆銆?
---

### 52. list_node_snapshots

鍒楀嚭鑺傜偣蹇収銆?
---

### 53. save_node_snapshot

淇濆瓨褰撳墠鑺傜偣鐘舵€佸揩鐓с€?
**鍙傛暟**:
- `name` (鍙€?: 鑷畾涔夊揩鐓у悕

---

### 54. restore_node_snapshot

鎭㈠鑺傜偣蹇収銆?
**鍙傛暟**:
- `name` (蹇呴渶)

---

### 55. bisect_start

寮€濮嬩簩鍒嗘帓鏌ユ晠闅滆妭鐐广€?
---

### 56. bisect_good

鏍囪褰撳墠鑺傜偣闆嗕负姝ｅ父锛堥棶棰樹笉瀛樺湪锛夈€?
---

### 57. bisect_bad

鏍囪褰撳墠鑺傜偣闆嗕负寮傚父锛堥棶棰樺瓨鍦級銆?
---

### 58. scaffold_custom_node

鍒涘缓鑷畾涔夎妭鐐瑰紑鍙戞ā鏉裤€?
**鍙傛暟**:
- `name` (蹇呴渶): 鍖呭悕锛堝皬鍐?slug锛?- `display_name` (蹇呴渶): 鏄剧ず鍚?- `category` (鍙€?: 鑺傜偣鑿滃崟鍒嗙被
- `description` (鍙€?
- `publisher_id` (鍙€?
- `with_frontend` (鍙€?: 鐢熸垚鍓嶇 stub
- `with_ci` (鍙€?: 鐢熸垚 GitHub Actions 鍙戝竷娴佺▼
- `overwrite` (鍙€?

---

### 59. verify_custom_node

楠岃瘉鑷畾涔夎妭鐐规槸鍚︽甯稿姞杞姐€?
**鍙傛暟**:
- `name` (鍙€?: 鍖呭悕
- `class_types` (鍙€?: 鏄惧紡鎸囧畾鑺傜偣绫诲瀷
- `restart` (鍙€?: 閲嶅惎 ComfyUI 鍚庨獙璇侊紙榛樿 true锛?
---

### 60. publish_custom_node

鍙戝竷鑺傜偣鍒?Comfy Registry銆?
**鍙傛暟**:
- `name` (鍙€?
- `path` (鍙€?

---

### 61. get_logs

鑾峰彇 ComfyUI 杩愯鏃ュ織銆?
**鍙傛暟**:
- `max_lines` (鍙€?: 榛樿 100
- `keyword` (鍙€?: 鍏抽敭璇嶈繃婊?
---

### 62. get_history

鏌ョ湅浠诲姟鎵ц鍘嗗彶锛堝惈閿欒鍫嗘爤锛夈€?
---

### 63. get_system_stats

鏌ョ湅绯荤粺淇℃伅锛圙PU 鏄惧瓨銆佺増鏈瓑锛夈€?
---

### 64. clear_vram

閲婃斁 GPU 鏄惧瓨銆?
**鍙傛暟**:
- `unload_models` (鍙€?: 鍗歌浇妯″瀷锛堥粯璁?true锛?- `free_memory` (鍙€?: 閲婃斁缂撳瓨锛堥粯璁?true锛?
---

### 65. get_embeddings

鍒楀嚭 textual inversion 宓屽叆銆?
---

### 66. health_check

鍏ㄩ潰璇婃柇 ComfyUI 鐘舵€併€?
**鍙傛暟**:
- `model_categories` (鍙€?: 瑕佹鏌ョ殑妯″瀷绫诲埆
- `recent_errors` (鍙€?: 鍖呭惈鐨勬渶杩戦敊璇鏁?
---

### 67. extract_workflow_dependencies

鍒嗘瀽宸ヤ綔娴侀渶瑕佺殑鑷畾涔夎妭鐐广€?
**鍙傛暟**:
- `workflow` (蹇呴渶)

---

### 68. install_workflow_dependencies

鑷姩瀹夎宸ヤ綔娴佺己澶辩殑鑺傜偣銆?
**鍙傛暟**:
- `workflow` (蹇呴渶)

---

### 69. get_defaults

鏌ョ湅褰撳墠榛樿鍙傛暟銆?
---

### 70. set_defaults

璁剧疆榛樿鍙傛暟銆?
**鍙傛暟**:
- `values` (蹇呴渶): 閿€煎
- `persist` (鍙€?: 鏄惁鎸佷箙鍖栧埌閰嶇疆鏂囦欢

---

### 71. suggest_settings

鍩轰簬鍘嗗彶鏁版嵁鎺ㄨ崘鏈€浣冲弬鏁般€?
**鍙傛暟**:
- `model_family` (鍙€?: 濡?`sdxl` / `flux`
- `lora_hash` (鍙€?
- `search` (鍙€?: 妯″瀷鍚嶆悳绱?- `limit` (鍙€?: 榛樿 10

---

### 72. generation_stats

鏌ョ湅鐢熸垚鍘嗗彶缁熻銆?
**鍙傛暟**:
- `model_family` (鍙€?

---

### 73. convert_image

杞崲鍥剧墖鏍煎紡銆?
**鍙傛暟**:
- `asset_id` 鎴?`path` (浜岄€変竴)
- `format` (蹇呴渶): `png` / `jpeg` / `webp`
- `quality` (鍙€?: 1-100
- `progressive` (鍙€?: JPEG 娓愯繘寮?- `lossless` (鍙€?: WebP 鏃犳崯
- `effort` (鍙€?: WebP 缂栫爜鍔姏 0-6
- `out_path` (鍙€?: 杈撳嚭璺緞

---

### 74. upload_output

涓婁紶鐢熸垚缁撴灉鍒颁簯瀛樺偍锛圫3 / Azure / HTTP PUT / HuggingFace锛夈€?
**鍙傛暟**:
- `asset_id` 鎴?`path` (浜岄€変竴)
- `destination` (蹇呴渶): `{s3: {...}}` / `{azure: {...}}` / `{http: {...}}` / `{hf: {...}}`

---

### 75. list_output_images

鍒楀嚭 ComfyUI 杈撳嚭鐩綍鐨勫浘鐗囥€?
**鍙傛暟**:
- `limit` (鍙€?: 榛樿 20
- `pattern` (鍙€?: 鏂囦欢鍚嶈繃婊?
---

### 76. generate_image

蹇嵎鏂囩敓鍥撅紙鑷姩鏋勫缓宸ヤ綔娴侊級銆?
**鍙傛暟**:
- `prompt` (蹇呴渶)
- `negative_prompt` (鍙€?
- `width` / `height` / `steps` / `cfg` / `sampler` / `scheduler` / `seed` (鍙€?
- `checkpoint` (鍙€?: 鑷姩閫夋嫨
- `batch_size` (鍙€?

---

### 77. generate_with_controlnet

ControlNet 鏉′欢鐢熸垚銆?
**鍙傛暟**:
- `prompt` (蹇呴渶)
- `control_image` (蹇呴渶): 宸蹭笂浼犵殑鎺у埗鍥炬枃浠跺悕
- `controlnet_model` (鍙€?: 鑷姩閫夋嫨
- `strength` (鍙€?: 鎺у埗寮哄害
- 閫氱敤鍙傛暟: `width` / `height` / `steps` / `cfg` / `sampler` / `scheduler` / `seed` / `checkpoint`

---

### 78. generate_with_ip_adapter

IP-Adapter 鍙傝€冨浘鐢熸垚銆?
**鍙傛暟**:
- `prompt` (蹇呴渶)
- `reference_image` (蹇呴渶): 宸蹭笂浼犵殑鍙傝€冨浘鏂囦欢鍚?- `weight` (鍙€?: IP-Adapter 鏉冮噸
- `preset` (鍙€?: 棰勮锛堥粯璁?`PLUS (high strength)`锛?- 閫氱敤鍙傛暟

---

### 79. get_workspace

鏌ョ湅褰撳墠 ComfyUI 瀹夎璺緞銆?
---

### 80. set_default_workspace

璁剧疆榛樿宸ヤ綔绌洪棿銆?
**鍙傛暟**:
- `path` (蹇呴渶)

---

### 81. list_workspaces

鍒楀嚭妫€娴嬪埌鐨?ComfyUI 瀹夎銆?
---

### 82. get_environment

鏌ョ湅 ComfyUI 鐜璇︽儏銆?
---

### 83. stop_comfyui

鍋滄 ComfyUI 杩涚▼銆?
---

### 84. start_comfyui

鍚姩 ComfyUI銆?
---

### 85. restart_comfyui

閲嶅惎 ComfyUI銆?
---

### 86. apply_manifest

搴旂敤 ComfyUI 閰嶇疆娓呭崟銆?
**鍙傛暟**:
- `manifest` 鎴?`path` (浜岄€変竴)

---

### 87. install_comfyui

鍏ㄦ柊瀹夎 ComfyUI銆?
**鍙傛暟**:
- `target_path` (蹇呴渶)
- `skip_manager` (鍙€?
- `use_uv` (鍙€?
- `version` (鍙€?

---

### 88. update_comfyui

鏇存柊 ComfyUI 鏍稿績銆?
---

### 89. update_all

鏇存柊鎵€鏈夎嚜瀹氫箟鑺傜偣銆?
---

## 瀹屾暣宸ヤ綔娴佺▼

### 鍦烘櫙 1锛氫粠闆跺紑濮嬬敓鎴愬浘鐗?
```
1. list_templates()                    // 鍒楀嚭鍙敤妯℃澘
2. select_template("txt2img", {        // 鍒涘缓 Session
     checkpoint: "PonyDiffusionV6XL.safetensors",
     positive_prompt: "1girl, beautiful",
     width: 1024, height: 1024
   })
   鈫?session_id: "sess_abc123"
3. modify_workflow("sess_abc123", [    // 添加 LoRA（智能插入，自动连线）
     { op: "add_node", class_type: "LoraLoader",
       inputs: { lora_name: "add-detail-xl.safetensors", strength_model: 0.8, strength_clip: 0.8 },
       insert_between: { source_id: "1", output_index: 0, target_id: "4", input_name: "model" } }
   ])
4. validate_workflow("sess_abc123")    // 楠岃瘉
5. run_workflow("sess_abc123")         // 杩愯
   鈫?prompt_id: "prompt_xyz789"
6. get_job_status("prompt_xyz789")     // 鐩戞帶
7. save_session_as_workflow("sess_abc123", "鎴戠殑Lora宸ヤ綔娴乢v1")  // 淇濆瓨
8. close_session("sess_abc123")        // 娓呯悊
```

### 鍦烘櫙 2锛氬姞杞藉凡鏈夊伐浣滄祦缁х画缂栬緫

```
1. list_workflows()                    // 鍒楀嚭宸叉湁宸ヤ綔娴?2. load_workflow("鎴戠殑Lora宸ヤ綔娴?json")  // 鍔犺浇涓?Session
   鈫?session_id: "sess_def456"
3. modify_workflow("sess_def456", [...]) // 淇敼
4. run_workflow("sess_def456")         // 杩愯
```

### 鍦烘櫙 3锛氬揩鎹风敓鎴愶紙涓嶇敤 Session锛?
```
generate_image({
  prompt: "1girl, beautiful, masterpiece",
  checkpoint: "PonyDiffusionV6XL.safetensors",
  width: 1024, height: 1024
})
鈫?prompt_id: "prompt_abc"
```

### 鍦烘櫙 4锛氫粠鍥剧墖鍙嶅悜宸ョ▼宸ヤ綔娴?
```
1. workflow_from_image("/path/to/ComfyUI_00001_.png")
   鈫?鎻愬彇鍑哄畬鏁村伐浣滄祦 JSON
2. 鐢ㄦ JSON 璋冪敤 enqueue_workflow() 鎴?save_workflow()
```

### 鍦烘櫙 5锛氭帓鏌ユ晠闅滆妭鐐?
```
1. bisect_start()                      // 寮€濮嬩簩鍒?2. 閲嶅惎 ComfyUI锛屾祴璇曞伐浣滄祦
3. bisect_good() 鎴?bisect_bad()       // 鏍规嵁缁撴灉鏍囪
4. 閲嶅姝ラ 2-3 鐩村埌鎵惧埌鏁呴殰鑺傜偣
5. bisect_reset()                      // 鎭㈠鎵€鏈夎妭鐐?```

---

## modify_workflow 鎿嶄綔璇﹁В

### 1. set_input 鈥?淇敼鑺傜偣鍙傛暟

```json
{
  "op": "set_input",
  "node_id": "3",
  "input_name": "text",
  "value": "1girl, beautiful, masterpiece"
}
```

### 2. add_node 鈥?娣诲姞鏂拌妭鐐?
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
杩斿洖鏂拌妭鐐圭殑 `node_id`銆?
### 3. remove_node 鈥?鍒犻櫎鑺傜偣

```json
{"op": "remove_node", "node_id": "8"}
```

### 4. connect 鈥?寤虹珛杩炴帴

```json
{
  "op": "connect",
  "source_id": "1",
  "output_index": 0,
  "target_id": "5",
  "input_name": "model"
}
```
鍚箟锛氳妭鐐?1 鐨勮緭鍑?0 鈫?鑺傜偣 5 鐨?model 杈撳叆銆?

## 甯歌闂

### Q: 濡備綍鐭ラ亾鑺傜偣 ID锛?鐢?`get_session("sess_xxx")` 鏌ョ湅褰撳墠 Session 鐨勮妭鐐瑰垪琛紝鎴栫敤 `visualize_workflow` 鐢熸垚 Mermaid 鍥俱€?
### Q: 濡備綍鏌ヨ妭鐐瑰弬鏁帮紵
```
get_node_info("LoraLoader")
鈫?杩斿洖 inputs/outputs schema锛屽寘鍚弬鏁板悕銆佺被鍨嬨€侀粯璁ゅ€?```

### Q: 宸ヤ綔娴佽繍琛屽け璐ユ€庝箞璋冭瘯锛?```
1. get_history("prompt_xxx") 鈫?鏌ョ湅 Python traceback
2. get_logs(keyword="error") 鈫?鏌ョ湅 ComfyUI 鏃ュ織
3. validate_workflow("sess_xxx") 鈫?鎵ц鍓嶉獙璇?```

### Q: Session 浼氭寔涔呭寲鍚楋紵
浼氥€係ession 瀛樺偍鍦?`data/cache/`锛岄噸鍚湇鍔″悗鑷姩鎭㈠銆傜敤 `list_sessions()` 鏌ョ湅锛宍close_session()` 娓呯悊銆?
### Q: 濡備綍娣诲姞鑷畾涔夋ā鏉匡紵
1. 浠庨璁炬ā鏉垮垱寤?Session
2. 淇敼宸ヤ綔娴?3. `save_session("sess_xxx", "鎴戠殑妯℃澘", { save_as: "template" })`
4. 浠ュ悗鐩存帴 `select_template("鎴戠殑妯℃澘")` 浣跨敤

### Q: 濡備綍淇濆瓨鍒板祵濂楀瓙鏂囦欢澶癸紵
```
save_session("sess_xxx", "lora_v1", { save_as: "template", path: "pony/experimental" })
鈫?淇濆瓨鍒?data/templates/custom/pony/experimental/lora_v1.json
```

### Q: 濡備綍鍥為€€璇搷浣滐紵
```
modify_workflow("sess_xxx", [...])  // 璇搷浣?undo_modify("sess_xxx")             // 鍥為€€鍒颁箣鍓嶇姸鎬?```

### Q: 濡備綍瀵规瘮涓や釜 Session 鐨勫樊寮傦紵
```
diff_sessions("sess_abc", "sess_def")
鈫?杩斿洖鏂板/鍒犻櫎/淇敼鐨勮妭鐐瑰垪琛?```

### Q: select_template 鐨勫弬鏁板悕鍜岃妭鐐硅緭鍏ュ悕涓嶄竴鑷存€庝箞鍔烇紵
涓嶉渶瑕佹媴蹇冦€俙select_template` 鍐呯疆浜嗗弬鏁版槧灏勶紝浼氳嚜鍔ㄦ妸甯歌鍙傛暟鍚嶆槧灏勫埌姝ｇ‘鐨勮妭鐐硅緭鍏ワ細

| 浣犱紶鐨勫弬鏁?| 瀹為檯鏄犲皠鍒扮殑鑺傜偣杈撳叆 |
|-----------|-------------------|
| `positive_prompt` | `CLIPTextEncode.text`锛堟壘 title 鍚?"Positive" 鐨勮妭鐐癸級 |
| `negative_prompt` | `CLIPTextEncode.text`锛堟壘 title 鍚?"Negative" 鐨勮妭鐐癸級 |
| `checkpoint` | `CheckpointLoaderSimple.ckpt_name` |
| `image_path` | `LoadImage.image` |
| `controlnet_model` | `ControlNetLoader.control_net_name` |
| `upscale_model` | `UpscaleModelLoader.model_name` |

鍚嶅瓧瀹屽叏涓€鑷寸殑鍙傛暟锛堝 `width`, `height`, `seed`, `steps`, `cfg`锛変細鐩存帴绮剧‘鍖归厤銆?
### Q: 濡備綍浠庣綉涓婁笅杞界殑宸ヤ綔娴?JSON 瀵煎叆锛?```
import_workflow_from_json(json_string, "涓嬭浇鐨凩oRA宸ヤ綔娴?, "session")
鈫?杩斿洖 session_id锛屽彲鐩存帴鐢?modify_workflow 缂栬緫
```

### Q: 濡備綍鏌ョ湅 Session 鐨勬搷浣滃巻鍙诧紵
```
get_session_history("sess_xxx")
鈫?杩斿洖鎵€鏈夋搷浣滆褰曪紙鏃堕棿鎴?+ 鎿嶄綔鎻忚堪锛?```

---

## 鏈€浣冲疄璺?
1. **姣忔鎿嶄綔鍓嶉獙璇?*: `validate_workflow("sess_xxx")` 鈫?纭娌￠棶棰樺啀璺戯紝鍑洪敊鏃跺埄鐢?`auto_fix` 鑷姩淇
2. **鐢ㄥ畬鍏抽棴 Session**: `close_session("sess_xxx")` 鈫?閲婃斁鍐呭瓨
3. **淇濆瓨閲嶈宸ヤ綔娴?*: `save_session("sess_xxx", "鐗堟湰鍚?, { save_as: "workflow" })` 鈫?闃蹭涪澶憋紝鏀寔宓屽璺緞
4. **鏌ヨ鑺傜偣淇℃伅**: 鍔犳柊鑺傜偣鍓嶅厛 `get_node_info()` 鈫?閬垮厤鍙傛暟閿欒
5. **灏忔淇敼**: 姣忔 `modify_workflow` 鍙仛 1-2 涓搷浣?鈫?鍑洪敊瀹规槗瀹氫綅
6. **鐢?insert_between 绠€鍖栬繛绾?*: 姣旀墜鍔?add_node + connect 鏇寸畝鍗?7. **蹇嵎鐢熸垚浼樺厛**: 绠€鍗曞満鏅敤 `generate_image`锛屽鏉傚満鏅敤 Session + `modify_workflow`
8. **瀹氭湡妫€鏌ュ仴搴?*: 鎵归噺浠诲姟鍓嶇敤 `health_check()` 纭 ComfyUI 鐘舵€?9. **鍒╃敤 Session 鍘嗗彶**: 淇敼鍓?`get_session_history()` 鏌ョ湅鍋氫簡浠€涔堬紝鍑洪敊鏃?`undo_modify()` 鍥為€€
10. **鍒嗘敮瀹為獙**: 鐢?`fork_session()` 鍒涘缓鏂板垎鏀皾璇曚笉鍚屽弬鏁帮紝涓嶅奖鍝嶅師宸ヤ綔娴?11. **瀵规瘮宸紓**: 鐢?`diff_sessions()` 瀵规瘮涓嶅悓鐗堟湰锛岀‘璁ゆ敼浜嗕粈涔?12. **瀵煎叆澶栭儴宸ヤ綔娴?*: 鐢?`import_workflow_from_json()` 瀵煎叆缃戜笂涓嬭浇鐨勫伐浣滄祦锛岃嚜鍔ㄨ瘑鍒?UI/API 鏍煎紡
