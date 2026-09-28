/**
 * Executes canvas nodes through the shared generation system.
 *
 * Nothing here runs a pipeline directly: image and motion nodes call
 * `useGeneration().generate`, store the resulting project id on the node and
 * then wait for the project store to report a terminal status. `runAll` walks
 * the graph in topological order so a motion node always starts after the
 * image it consumes has finished.
 */
import { useCallback, useRef, useState } from "react";
import { useGeneration } from "../../hooks/useGeneration";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { CAMERA_PRESETS, cameraFromPreset, findModel } from "../../lib/catalog";
import type { CameraPreset } from "../../lib/catalog";
import type { GenerationProject } from "../../types/project";
import { NODE_LABELS, findUpstream, topologicalOrderOf, useCanvasStore } from "./canvas-store";
import type { CanvasEdge, CanvasNode } from "./canvas-store";

export const DEFAULT_IMAGE_MODEL = "flux-realism-v2";
export const MOTION_MODEL = "motion-v1-realism";
export const MOTION_CREDIT_COST = 15;
export const DEFAULT_CAMERA_PRESET = "dolly-in";
export const DEFAULT_DURATION = 3;
export const DEFAULT_MOTION_STRENGTH = 6;
export const UPSTREAM_IMAGE_MESSAGE = "Run the upstream image node first";

export interface CanvasRunner {
  /** Runs a single image/motion node and resolves once its generation settles. */
  runNode: (nodeId: string) => Promise<void>;
  /** Runs every image/motion node in topological order, awaiting each one. */
  runAll: () => Promise<void>;
  running: boolean;
  runningNodeId?: string;
}

/** Text a prompt/text node contributes to the nodes downstream of it. */
export function nodeText(node?: CanvasNode): string {
  if (!node) return "";
  const raw = node.type === "text" ? node.data.text : node.data.prompt;
  return raw?.trim() ?? "";
}

/** Upstream prompt/text, then the node's own prompt — blanks skipped. */
export function resolveImagePrompt(nodes: CanvasNode[], edges: CanvasEdge[], node: CanvasNode): string {
  const upstream = findUpstream(nodes, edges, node.id);
  return [nodeText(upstream), node.data.prompt?.trim() ?? ""].filter(Boolean).join(", ");
}

function presetById(id: string): CameraPreset {
  return CAMERA_PRESETS.find((preset) => preset.id === id) ?? CAMERA_PRESETS.find((preset) => preset.id === DEFAULT_CAMERA_PRESET)!;
}

/**
 * Resolves once `projectId` reaches a terminal status. Rejects with the
 * failure message on `failed`/`cancelled` so a run can stop early.
 */
export function waitForProject(projectId: string): Promise<GenerationProject> {
  return new Promise<GenerationProject>((resolve, reject) => {
    const subscription: { stop?: () => void } = {};
    let settled = false;
    const settle = (finish: () => void): boolean => {
      if (settled) return true;
      settled = true;
      subscription.stop?.();
      finish();
      return true;
    };
    const inspect = (project?: GenerationProject): boolean => {
      if (!project) return settle(() => reject(new Error("The generation was removed before it finished.")));
      switch (project.status) {
        case "completed":
          return settle(() => resolve(project));
        case "failed":
          return settle(() => reject(new Error(project.errorMessage ?? "Generation failed.")));
        case "cancelled":
          return settle(() => reject(new Error("Generation cancelled.")));
        default:
          return false;
      }
    };
    if (inspect(useProjectStore.getState().getProject(projectId))) return;
    subscription.stop = useProjectStore.subscribe((state) => {
      inspect(state.projects.find((project) => project.id === projectId));
    });
  });
}

export function useCanvasRunner(): CanvasRunner {
  const { generate } = useGeneration();
  const addToast = useUIStore((s) => s.addToast);
  const [running, setRunning] = useState(false);
  const [runningNodeId, setRunningNodeId] = useState<string | undefined>(undefined);
  const busy = useRef(false);

  /** Starts one node. Returns the project, or null when the run must stop. */
  const startNode = useCallback(
    (node: CanvasNode, nodes: CanvasNode[], edges: CanvasEdge[]): GenerationProject | null => {
      if (node.type === "image") {
        const prompt = resolveImagePrompt(nodes, edges, node);
        if (!prompt) {
          addToast("Connect a prompt node or type a prompt on this image node first.", { type: "warning", title: "Nothing to generate" });
          return null;
        }
        const modelId = node.data.model ?? DEFAULT_IMAGE_MODEL;
        return generate({
          type: "image",
          prompt,
          model: modelId,
          aspectRatio: node.data.aspectRatio ?? "16:9",
          creditCost: findModel(modelId)?.creditCost ?? 5,
          origin: "canvas",
          tags: ["canvas"],
        });
      }

      const upstream = findUpstream(nodes, edges, node.id);
      const imageNode = upstream?.type === "image" ? upstream : undefined;
      const imageProject = imageNode?.data.projectId ? useProjectStore.getState().getProject(imageNode.data.projectId) : undefined;
      if (!imageNode || !imageProject || imageProject.status !== "completed" || !imageProject.outputAssetId) {
        addToast(UPSTREAM_IMAGE_MESSAGE, { type: "warning" });
        return null;
      }
      const chainPrompt = nodeText(findUpstream(nodes, edges, imageNode.id)) || imageProject.prompt;
      return generate({
        type: "video",
        prompt: chainPrompt,
        model: MOTION_MODEL,
        aspectRatio: imageProject.aspectRatio,
        duration: node.data.duration ?? DEFAULT_DURATION,
        cameraMotion: cameraFromPreset(presetById(node.data.cameraPreset ?? DEFAULT_CAMERA_PRESET)),
        motionStrength: node.data.motionStrength ?? DEFAULT_MOTION_STRENGTH,
        sourceAssetId: imageProject.outputAssetId,
        creditCost: MOTION_CREDIT_COST,
        origin: "canvas",
        tags: ["canvas"],
      });
    },
    [addToast, generate],
  );

  /** Runs one node to completion. Returns false when the surrounding run should stop. */
  const execute = useCallback(
    async (nodeId: string): Promise<boolean> => {
      const { nodes, edges, updateNodeData } = useCanvasStore.getState();
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (!node || (node.type !== "image" && node.type !== "motion")) return true;

      const project = startNode(node, nodes, edges);
      if (!project) return false; // blocked: empty prompt, missing upstream or not enough credits
      updateNodeData(node.id, { projectId: project.id });
      setRunningNodeId(node.id);
      try {
        await waitForProject(project.id);
        return true;
      } catch (error) {
        addToast(error instanceof Error ? error.message : "Generation failed.", {
          type: "error",
          title: `${NODE_LABELS[node.type]} node failed`,
        });
        return false;
      }
    },
    [addToast, startNode],
  );

  const runNode = useCallback(
    async (nodeId: string) => {
      if (busy.current) return;
      busy.current = true;
      setRunning(true);
      try {
        await execute(nodeId);
      } finally {
        busy.current = false;
        setRunning(false);
        setRunningNodeId(undefined);
      }
    },
    [execute],
  );

  const runAll = useCallback(async () => {
    if (busy.current) return;
    const { nodes, edges } = useCanvasStore.getState();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const queue = topologicalOrderOf(nodes, edges).filter((id) => {
      const type = byId.get(id)?.type;
      return type === "image" || type === "motion";
    });
    if (queue.length === 0) {
      addToast("Add an image or motion node before running the graph.", { type: "warning" });
      return;
    }
    busy.current = true;
    setRunning(true);
    try {
      for (const id of queue) {
        const ok = await execute(id);
        if (!ok) break;
      }
    } finally {
      busy.current = false;
      setRunning(false);
      setRunningNodeId(undefined);
    }
  }, [addToast, execute]);

  return { runNode, runAll, running, runningNodeId };
}
