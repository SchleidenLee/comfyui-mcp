import type { WorkflowJSON, WorkflowNode, ComfyUINodeDef, ObjectInfo } from "../comfyui/types.js";
import { getObjectInfo } from "../comfyui/client.js";
import { ValidationError } from "../utils/errors.js";

// --- Helpers ---

export function getNextNodeId(workflow: WorkflowJSON): string {
  const ids = Object.keys(workflow).map(Number).filter((n) => !Number.isNaN(n));
  return String(ids.length === 0 ? 1 : Math.max(...ids) + 1);
}

function conn(nodeId: string, outputIndex: number): [string, number] {
  return [nodeId, outputIndex];
}

// --- Template parameter types ---

interface Txt2ImgParams {
  checkpoint?: string;
  positive_prompt?: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler_name?: string;
  scheduler?: string;
}

interface Img2ImgParams extends Txt2ImgParams {
  image_path?: string;
  denoise?: number;
}

interface UpscaleParams {
  upscale_model?: string;
  image_path?: string;
}

interface InpaintParams extends Img2ImgParams {
  mask_path?: string;
}

interface ControlNetParams extends Txt2ImgParams {
  control_image?: string;
  controlnet_model?: string;
  strength?: number;
}

interface IpAdapterParams extends Txt2ImgParams {
  reference_image?: string;
  weight?: number;
  preset?: string;
}

type TemplateParams =
  | Txt2ImgParams
  | Img2ImgParams
  | UpscaleParams
  | InpaintParams
  | ControlNetParams
  | IpAdapterParams;

// --- Templates ---

function buildTxt2Img(p: Txt2ImgParams): WorkflowJSON {
  const ckpt = p.checkpoint ?? "sd_xl_base_1.0.safetensors";
  const positive = p.positive_prompt ?? "";
  const negative = p.negative_prompt ?? "";
  const width = p.width ?? 1024;
  const height = p.height ?? 1024;
  const steps = p.steps ?? 20;
  const cfg = p.cfg ?? 8.0;
  const seed = p.seed ?? Math.floor(Math.random() * 2 ** 48);
  const sampler = p.sampler_name ?? "euler";
  const scheduler = p.scheduler ?? "normal";

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: conn("1", 1) },
      _meta: { title: "Positive Prompt" },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: conn("1", 1) },
      _meta: { title: "Negative Prompt" },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        model: conn("1", 0),
        positive: conn("2", 0),
        negative: conn("3", 0),
        latent_image: conn("4", 0),
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1.0,
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: conn("5", 0), vae: conn("1", 2) },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { images: conn("6", 0), filename_prefix: "ComfyUI" },
    },
  };
}

function buildImg2Img(p: Img2ImgParams): WorkflowJSON {
  const ckpt = p.checkpoint ?? "sd_xl_base_1.0.safetensors";
  const positive = p.positive_prompt ?? "";
  const negative = p.negative_prompt ?? "";
  const steps = p.steps ?? 20;
  const cfg = p.cfg ?? 8.0;
  const seed = p.seed ?? Math.floor(Math.random() * 2 ** 48);
  const sampler = p.sampler_name ?? "euler";
  const scheduler = p.scheduler ?? "normal";
  const denoise = p.denoise ?? 0.75;
  const imagePath = p.image_path ?? "input.png";

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: imagePath },
    },
    "3": {
      class_type: "VAEEncode",
      inputs: { pixels: conn("2", 0), vae: conn("1", 2) },
    },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: conn("1", 1) },
      _meta: { title: "Positive Prompt" },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: conn("1", 1) },
      _meta: { title: "Negative Prompt" },
    },
    "6": {
      class_type: "KSampler",
      inputs: {
        model: conn("1", 0),
        positive: conn("4", 0),
        negative: conn("5", 0),
        latent_image: conn("3", 0),
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise,
      },
    },
    "7": {
      class_type: "VAEDecode",
      inputs: { samples: conn("6", 0), vae: conn("1", 2) },
    },
    "8": {
      class_type: "SaveImage",
      inputs: { images: conn("7", 0), filename_prefix: "ComfyUI" },
    },
  };
}

function buildUpscale(p: UpscaleParams): WorkflowJSON {
  const model = p.upscale_model ?? "RealESRGAN_x4plus.pth";
  const imagePath = p.image_path ?? "input.png";

  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: imagePath },
    },
    "2": {
      class_type: "UpscaleModelLoader",
      inputs: { model_name: model },
    },
    "3": {
      class_type: "ImageUpscaleWithModel",
      inputs: { upscale_model: conn("2", 0), image: conn("1", 0) },
    },
    "4": {
      class_type: "SaveImage",
      inputs: { images: conn("3", 0), filename_prefix: "ComfyUI_upscale" },
    },
  };
}

function buildInpaint(p: InpaintParams): WorkflowJSON {
  const ckpt = p.checkpoint ?? "sd_xl_base_1.0.safetensors";
  const positive = p.positive_prompt ?? "";
  const negative = p.negative_prompt ?? "";
  const steps = p.steps ?? 20;
  const cfg = p.cfg ?? 8.0;
  const seed = p.seed ?? Math.floor(Math.random() * 2 ** 48);
  const sampler = p.sampler_name ?? "euler";
  const scheduler = p.scheduler ?? "normal";
  const denoise = p.denoise ?? 0.85;
  const imagePath = p.image_path ?? "input.png";
  const maskPath = p.mask_path ?? "mask.png";

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: imagePath },
      _meta: { title: "Input Image" },
    },
    "3": {
      class_type: "LoadImage",
      inputs: { image: maskPath },
      _meta: { title: "Mask" },
    },
    "4": {
      class_type: "VAEEncode",
      inputs: { pixels: conn("2", 0), vae: conn("1", 2) },
    },
    "5": {
      class_type: "SetLatentNoiseMask",
      inputs: { samples: conn("4", 0), mask: conn("3", 1) },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: conn("1", 1) },
      _meta: { title: "Positive Prompt" },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: conn("1", 1) },
      _meta: { title: "Negative Prompt" },
    },
    "8": {
      class_type: "KSampler",
      inputs: {
        model: conn("1", 0),
        positive: conn("6", 0),
        negative: conn("7", 0),
        latent_image: conn("5", 0),
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise,
      },
    },
    "9": {
      class_type: "VAEDecode",
      inputs: { samples: conn("8", 0), vae: conn("1", 2) },
    },
    "10": {
      class_type: "SaveImage",
      inputs: { images: conn("9", 0), filename_prefix: "ComfyUI_inpaint" },
    },
  };
}

function buildControlNet(p: ControlNetParams): WorkflowJSON {
  const ckpt = p.checkpoint ?? "sd_xl_base_1.0.safetensors";
  const positive = p.positive_prompt ?? "";
  const negative = p.negative_prompt ?? "";
  const width = p.width ?? 1024;
  const height = p.height ?? 1024;
  const steps = p.steps ?? 20;
  const cfg = p.cfg ?? 8.0;
  const seed = p.seed ?? Math.floor(Math.random() * 2 ** 48);
  const sampler = p.sampler_name ?? "euler";
  const scheduler = p.scheduler ?? "normal";
  const controlNet = p.controlnet_model ?? "control_v11p_sd15_canny.pth";
  const controlImage = p.control_image ?? "control.png";
  const strength = p.strength ?? 1.0;

  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
    "2": {
      class_type: "LoadImage",
      inputs: { image: controlImage },
      _meta: { title: "Control Image" },
    },
    "3": { class_type: "ControlNetLoader", inputs: { control_net_name: controlNet } },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: conn("1", 1) },
      _meta: { title: "Positive Prompt" },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: conn("1", 1) },
      _meta: { title: "Negative Prompt" },
    },
    "6": {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        positive: conn("4", 0),
        negative: conn("5", 0),
        control_net: conn("3", 0),
        image: conn("2", 0),
        strength,
        start_percent: 0.0,
        end_percent: 1.0,
      },
    },
    "7": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "8": {
      class_type: "KSampler",
      inputs: {
        model: conn("1", 0),
        positive: conn("6", 0),
        negative: conn("6", 1),
        latent_image: conn("7", 0),
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1.0,
      },
    },
    "9": { class_type: "VAEDecode", inputs: { samples: conn("8", 0), vae: conn("1", 2) } },
    "10": {
      class_type: "SaveImage",
      inputs: { images: conn("9", 0), filename_prefix: "ComfyUI_controlnet" },
    },
  };
}

// Requires the ComfyUI_IPAdapter_plus custom node pack (IPAdapterUnifiedLoader, IPAdapter).
function buildIpAdapter(p: IpAdapterParams): WorkflowJSON {
  const ckpt = p.checkpoint ?? "sd_xl_base_1.0.safetensors";
  const positive = p.positive_prompt ?? "";
  const negative = p.negative_prompt ?? "";
  const width = p.width ?? 1024;
  const height = p.height ?? 1024;
  const steps = p.steps ?? 20;
  const cfg = p.cfg ?? 8.0;
  const seed = p.seed ?? Math.floor(Math.random() * 2 ** 48);
  const sampler = p.sampler_name ?? "euler";
  const scheduler = p.scheduler ?? "normal";
  const refImage = p.reference_image ?? "reference.png";
  const weight = p.weight ?? 0.8;
  const preset = p.preset ?? "PLUS (high strength)";

  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
    "2": {
      class_type: "LoadImage",
      inputs: { image: refImage },
      _meta: { title: "Reference Image" },
    },
    "3": {
      class_type: "IPAdapterUnifiedLoader",
      inputs: { model: conn("1", 0), preset },
    },
    "4": {
      class_type: "IPAdapter",
      inputs: {
        model: conn("3", 0),
        ipadapter: conn("3", 1),
        image: conn("2", 0),
        weight,
        start_at: 0.0,
        end_at: 1.0,
      },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: positive, clip: conn("1", 1) },
      _meta: { title: "Positive Prompt" },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: conn("1", 1) },
      _meta: { title: "Negative Prompt" },
    },
    "7": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "8": {
      class_type: "KSampler",
      inputs: {
        model: conn("4", 0),
        positive: conn("5", 0),
        negative: conn("6", 0),
        latent_image: conn("7", 0),
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1.0,
      },
    },
    "9": { class_type: "VAEDecode", inputs: { samples: conn("8", 0), vae: conn("1", 2) } },
    "10": {
      class_type: "SaveImage",
      inputs: { images: conn("9", 0), filename_prefix: "ComfyUI_ipadapter" },
    },
  };
}

const TEMPLATES: Record<string, (params: Record<string, unknown>) => WorkflowJSON> = {
  txt2img: (p) => buildTxt2Img(p as Txt2ImgParams),
  img2img: (p) => buildImg2Img(p as Img2ImgParams),
  upscale: (p) => buildUpscale(p as UpscaleParams),
  inpaint: (p) => buildInpaint(p as InpaintParams),
  controlnet: (p) => buildControlNet(p as ControlNetParams),
  ip_adapter: (p) => buildIpAdapter(p as IpAdapterParams),
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

export function createWorkflow(
  template: string,
  params: Record<string, unknown> = {},
): WorkflowJSON {
  const builder = TEMPLATES[template];
  if (!builder) {
    throw new ValidationError(
      `Unknown template "${template}". Available: ${TEMPLATE_NAMES.join(", ")}`,
    );
  }
  return builder(params);
}

// --- Modification operations ---

interface SetInputOp {
  op: "set_input";
  node_id: string;
  input_name: string;
  value: unknown;
}

interface AddNodeOp {
  op: "add_node";
  class_type: string;
  inputs?: Record<string, unknown>;
  id?: string;
  insert_between?: {
    source_id: string;
    output_index: number;
    target_id: string;
    input_name: string;
  };
}

interface RemoveNodeOp {
  op: "remove_node";
  node_id: string;
}

interface ConnectOp {
  op: "connect";
  source_id: string;
  output_index: number;
  target_id: string;
  input_name: string;
}

export type ModifyOperation =
  | SetInputOp
  | AddNodeOp
  | RemoveNodeOp
  | ConnectOp;

function applySetInput(wf: WorkflowJSON, op: SetInputOp): void {
  const node = wf[op.node_id];
  if (!node) throw new ValidationError(`Node "${op.node_id}" not found`);
  node.inputs[op.input_name] = op.value;
}

// --- Type-aware connection helpers ---

function typeMatches(inputType: string | string[], targetType: string): boolean {
  if (Array.isArray(inputType)) {
    return inputType.includes(targetType) || inputType.includes("*");
  }
  return inputType === targetType || inputType === "*";
}

function getNodeInputType(def: ComfyUINodeDef, inputName: string): string | string[] | null {
  const required = def.input.required ?? {};
  if (required[inputName]) {
    return required[inputName][0];
  }
  const optional = def.input.optional ?? {};
  if (optional[inputName]) {
    return optional[inputName][0];
  }
  return null;
}

function findMatchingInput(
  def: ComfyUINodeDef,
  sourceOutputType: string,
  existingInputs: Record<string, unknown>,
): { inputName: string; fromRequired: boolean } | null {
  const required = def.input.required ?? {};
  for (const [name, spec] of Object.entries(required)) {
    if (existingInputs[name] !== undefined) continue;
    const inputType = spec[0];
    if (typeof inputType === "string" || Array.isArray(inputType)) {
      if (typeMatches(inputType, sourceOutputType)) {
        return { inputName: name, fromRequired: true };
      }
    }
  }

  const optional = def.input.optional ?? {};
  for (const [name, spec] of Object.entries(optional)) {
    if (existingInputs[name] !== undefined) continue;
    const inputType = spec[0];
    if (typeof inputType === "string" || Array.isArray(inputType)) {
      if (typeMatches(inputType, sourceOutputType)) {
        return { inputName: name, fromRequired: false };
      }
    }
  }

  return null;
}

function findMatchingOutput(def: ComfyUINodeDef, targetInputType: string): number | null {
  for (let i = 0; i < def.output.length; i++) {
    if (def.output[i] === targetInputType || def.output[i] === "*") {
      return i;
    }
  }
  return null;
}

export interface ConnectionInfo {
  node_id: string;
  input_name: string;
  source_id: string;
  output_index: number;
  matched_type: string;
}

async function applyAddNode(
  wf: WorkflowJSON,
  op: AddNodeOp,
  objectInfo?: ObjectInfo,
): Promise<{ id: string; connectionInfo?: ConnectionInfo[] }> {
  const id = op.id ?? getNextNodeId(wf);
  if (wf[id]) throw new ValidationError(`Node ID "${id}" already exists`);

  const newInputs: Record<string, unknown> = { ...(op.inputs ?? {}) };
  const connectionInfo: ConnectionInfo[] = [];

  // If insert_between is specified, wire the new node between source and target
  if (op.insert_between) {
    const { source_id, output_index, target_id, input_name } = op.insert_between;
    if (!wf[source_id]) throw new ValidationError(`Source node "${source_id}" not found`);
    if (!wf[target_id]) throw new ValidationError(`Target node "${target_id}" not found`);

    const sourceClass = wf[source_id].class_type;
    const targetClass = wf[target_id].class_type;
    const newClass = op.class_type;

    if (objectInfo) {
      const sourceDef = objectInfo[sourceClass];
      const targetDef = objectInfo[targetClass];
      const newDef = objectInfo[newClass];

      // Determine source output type
      const sourceOutputType = sourceDef?.output[output_index] ?? null;

      // Find best input on new node matching source output type
      if (sourceOutputType && newDef) {
        const match = findMatchingInput(newDef, sourceOutputType, newInputs);
        if (match) {
          newInputs[match.inputName] = [source_id, output_index];
          connectionInfo.push({
            node_id: id,
            input_name: match.inputName,
            source_id,
            output_index,
            matched_type: sourceOutputType,
          });
        } else {
          // Fallback: try common names if type match fails
          const fallbackNames = ["model", "clip", "samples", "latent_image", "image", "conditioning", "pixels"];
          for (const name of fallbackNames) {
            if (!(name in newInputs) && newDef.input.required?.[name] !== undefined) {
              newInputs[name] = [source_id, output_index];
              connectionInfo.push({
                node_id: id,
                input_name: name,
                source_id,
                output_index,
                matched_type: sourceOutputType,
              });
              break;
            }
          }
        }
      }

      // Determine target input type and find matching output on new node
      let targetOutputIndex = 0;
      if (targetDef) {
        const targetInputType = getNodeInputType(targetDef, input_name);
        if (targetInputType && newDef) {
          const outMatch = findMatchingOutput(newDef, typeof targetInputType === "string" ? targetInputType : targetInputType[0]);
          if (outMatch !== null) {
            targetOutputIndex = outMatch;
          }
        }
      }

      wf[target_id].inputs[input_name] = [id, targetOutputIndex];
      if (connectionInfo.length > 0) {
        connectionInfo[connectionInfo.length - 1].output_index = targetOutputIndex;
      }
    } else {
      // No object_info available: use legacy hardcoded fallback
      const fallbackNames = ["model", "clip", "samples", "latent_image", "image", "conditioning", "pixels"];
      let connected = false;
      for (const name of fallbackNames) {
        if (!(name in newInputs)) {
          newInputs[name] = [source_id, output_index];
          connected = true;
          break;
        }
      }
      if (!connected) {
        newInputs["input"] = [source_id, output_index];
      }
      wf[target_id].inputs[input_name] = [id, 0];
    }

    wf[id] = {
      class_type: op.class_type,
      inputs: newInputs,
    };
  } else {
    wf[id] = {
      class_type: op.class_type,
      inputs: newInputs,
    };
  }

  return { id, connectionInfo: connectionInfo.length > 0 ? connectionInfo : undefined };
}

function applyRemoveNode(wf: WorkflowJSON, op: RemoveNodeOp): void {
  if (!wf[op.node_id]) throw new ValidationError(`Node "${op.node_id}" not found`);
  delete wf[op.node_id];

  // Clean up any connections pointing to the removed node
  for (const node of Object.values(wf)) {
    for (const [key, val] of Object.entries(node.inputs)) {
      if (
        Array.isArray(val) &&
        val.length === 2 &&
        typeof val[0] === "string" &&
        val[0] === op.node_id
      ) {
        delete node.inputs[key];
      }
    }
  }
}

function applyConnect(wf: WorkflowJSON, op: ConnectOp): void {
  if (!wf[op.source_id]) throw new ValidationError(`Source node "${op.source_id}" not found`);
  if (!wf[op.target_id]) throw new ValidationError(`Target node "${op.target_id}" not found`);
  wf[op.target_id].inputs[op.input_name] = [op.source_id, op.output_index];
}

export interface ModifyResult {
  workflow: WorkflowJSON;
  added_ids: string[];
  connection_info?: ConnectionInfo[];
}

export async function modifyWorkflow(
  workflow: WorkflowJSON,
  operations: ModifyOperation[],
): Promise<ModifyResult> {
  // Deep clone to avoid mutating the original
  const wf: WorkflowJSON = JSON.parse(JSON.stringify(workflow));
  const addedIds: string[] = [];
  const allConnectionInfo: ConnectionInfo[] = [];

  // Pre-load object_info if any insert_between operations exist
  const needsObjectInfo = operations.some(
    (op) => op.op === "add_node" && op.insert_between,
  );
  let objectInfo: ObjectInfo | undefined;
  if (needsObjectInfo) {
    try {
      objectInfo = await getObjectInfo();
    } catch {
      // Fall back to legacy hardcoded logic if object_info unavailable
    }
  }

  for (const op of operations) {
    switch (op.op) {
      case "set_input":
        applySetInput(wf, op);
        break;
      case "add_node": {
        const result = await applyAddNode(wf, op, objectInfo);
        addedIds.push(result.id);
        if (result.connectionInfo) {
          allConnectionInfo.push(...result.connectionInfo);
        }
        break;
      }
      case "remove_node":
        applyRemoveNode(wf, op);
        break;
      case "connect":
        applyConnect(wf, op);
        break;
      default:
        throw new ValidationError(`Unknown operation: ${(op as { op: string }).op}`);
    }
  }

  return {
    workflow: wf,
    added_ids: addedIds,
    connection_info: allConnectionInfo.length > 0 ? allConnectionInfo : undefined,
  };
}
