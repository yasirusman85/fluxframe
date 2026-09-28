import React, { useCallback, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Download, FolderOpen, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import type { AppField, CreativeApp } from "../../lib/catalog";
import type { GenerationStatus } from "../../types/project";
import { createAppPlan, validateAppValues } from "../../lib/apps";
import { useGeneration } from "../../hooks/useGeneration";
import { useAsset } from "../../hooks/useAsset";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { useAccountStore } from "../../store/account-store";
import { storeUploadedImage } from "../../lib/image-utils";
import { downloadProject } from "../../lib/download";
import { Button, Dropzone, Input, Modal, Select, Skeleton, Textarea } from "../../components/ui";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { ProviderBadge } from "../../components/media/ProviderBadge";
import { AppIcon } from "./AppIcon";

export interface AppRunModalProps {
  app: CreativeApp | null;
  open: boolean;
  onClose: () => void;
}

type Values = Record<string, string>;

function initialValues(app: CreativeApp | null): Values {
  const values: Values = {};
  for (const field of app?.fields ?? []) {
    values[field.key] = field.type === "select" ? (field.options?.[0] ?? "") : "";
  }
  return values;
}

function isActive(status: GenerationStatus | undefined): boolean {
  return status === "queued" || status === "processing";
}

/**
 * Runs one Creative App: a declarative form built from `app.fields`, then the
 * live job (QueuePanel) and finally the output preview. The generation itself
 * runs through the shared runner, so closing the dialog never cancels it.
 */
export function AppRunModal({ app, open, onClose }: AppRunModalProps) {
  const navigate = useNavigate();
  const formId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const firstTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { generate } = useGeneration();
  const balance = useCreditStore((s) => s.balance);
  const addToast = useUIStore((s) => s.addToast);
  const { autoplayPreviews, showProviderBadges } = useAccountStore(
    useShallow((s) => ({ autoplayPreviews: s.preferences.autoplayPreviews, showProviderBadges: s.preferences.showProviderBadges })),
  );

  const [values, setValues] = useState<Values>(() => initialValues(app));
  const [errors, setErrors] = useState<Values>({});
  const [previews, setPreviews] = useState<Values>({});
  const [projectId, setProjectId] = useState<string | null>(null);

  // Start a fresh session every time the dialog opens (state adjustment during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(initialValues(app));
      setErrors({});
      setPreviews({});
      setProjectId(null);
    }
  }

  const project = useProjectStore((s) => (projectId ? s.projects.find((p) => p.id === projectId) : undefined));
  const output = useAsset(project?.outputAssetId, project?.outputUrl);
  const phase: "form" | "job" | "done" = !project ? "form" : project.status === "completed" ? "done" : "job";
  const cost = app?.creditCost ?? 0;
  const affordable = balance >= cost;
  const initialFocusRef = app?.fields[0]?.type === "textarea" ? firstTextareaRef : firstInputRef;

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRun = () => {
    if (!app) return;
    const nextErrors: Values = { ...validateAppValues(app, values) };
    for (const field of app.fields) {
      if (field.required && !(values[field.key] ?? "").trim() && !nextErrors[field.key]) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      const plan = createAppPlan(app, values);
      const created = generate({ ...plan.project, pipeline: plan.pipeline });
      if (created) setProjectId(created.id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not start this app.", { type: "error", title: "App could not run" });
    }
  };

  const handleClose = useCallback(() => {
    const current = projectId ? useProjectStore.getState().getProject(projectId) : undefined;
    if (current && isActive(current.status)) {
      addToast(`${current.title} keeps running in the background and will appear in your library when it finishes.`, { type: "info" });
    }
    onClose();
  }, [projectId, onClose, addToast]);

  const openInLibrary = () => {
    if (!project) return;
    onClose();
    navigate(`/projects/${project.id}`);
  };

  const download = async () => {
    if (!project) return;
    try {
      await downloadProject(project);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Download failed.", { type: "error" });
    }
  };

  const runAgain = () => {
    setProjectId(null);
    setErrors({});
  };

  const renderField = (field: AppField, index: number) => {
    const testId = `app-field-${field.key}`;
    const error = errors[field.key];
    const value = values[field.key] ?? "";
    const label = field.required ? (
      field.label
    ) : (
      <>
        {field.label} <span className="font-normal text-zinc-400">(optional)</span>
      </>
    );
    const hint = field.help ? <span className="text-zinc-400">{field.help}</span> : undefined;

    switch (field.type) {
      case "text":
        return (
          <Input
            key={field.key}
            ref={index === 0 ? firstInputRef : undefined}
            testId={testId}
            label={label}
            hint={hint}
            error={error}
            value={value}
            placeholder={field.placeholder}
            autoComplete="off"
            aria-required={field.required || undefined}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
      case "textarea":
        return (
          <Textarea
            key={field.key}
            ref={index === 0 ? firstTextareaRef : undefined}
            testId={testId}
            label={label}
            hint={hint}
            error={error}
            value={value}
            placeholder={field.placeholder}
            rows={3}
            maxLength={400}
            showCount
            aria-required={field.required || undefined}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
      case "select":
        return (
          <div key={field.key} className="space-y-1.5">
            <Select
              testId={testId}
              label={label}
              hint={hint}
              value={value}
              onChange={(next) => setValue(field.key, next)}
              options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
            />
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </div>
        );
      case "image":
        return (
          <div key={field.key} className="space-y-1.5">
            <Dropzone
              accept="image"
              testId={testId}
              label={field.label}
              hint={field.help ?? "PNG, JPG or WebP up to 15 MB"}
              previewUrl={previews[field.key]}
              aspect="1 / 1"
              compact
              onFile={async (file) => {
                const stored = await storeUploadedImage(file);
                setPreviews((prev) => ({ ...prev, [field.key]: stored.url }));
                setValue(field.key, stored.assetId);
              }}
              onClear={() => {
                const url = previews[field.key];
                if (url) URL.revokeObjectURL(url);
                setPreviews((prev) => {
                  const next = { ...prev };
                  delete next[field.key];
                  return next;
                });
                setValue(field.key, "");
              }}
            />
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </div>
        );
    }
  };

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (app && phase === "form") {
    body = (
      <form
        id={formId}
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleRun();
        }}
      >
        <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-surface-2/60 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-500/20 bg-brand-500/10 text-brand-300">
            <AppIcon name={app.icon} className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm leading-relaxed text-zinc-400">{app.description}</p>
        </div>
        {app.fields.map(renderField)}
      </form>
    );
    footer = (
      <>
        <div className="mr-auto text-xs text-zinc-400">
          <span className="font-semibold text-amber-300">{cost} credits</span> · balance {balance.toLocaleString()}
          {!affordable && <span className="text-rose-300"> · not enough credits, you will be asked to top up</span>}
        </div>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" form={formId} data-testid="app-run" leftIcon={<Sparkles className="h-4 w-4" />}>
          Run {app.name} · {cost} credits
        </Button>
      </>
    );
  } else if (app && phase === "job" && project) {
    body = (
      <div className="space-y-4">
        <QueuePanel project={project} onView={openInLibrary} />
        <p className="text-xs leading-relaxed text-zinc-400">
          {app.steps > 1 && `${app.name} runs ${app.steps} generations in sequence; the stage above shows which one is in progress. `}
          You can close this dialog. The run continues in the background and lands in your library.
        </p>
      </div>
    );
    footer = (
      <>
        {!isActive(project.status) && (
          <Button variant="secondary" onClick={runAgain} leftIcon={<Undo2 className="h-4 w-4" />}>
            Edit inputs
          </Button>
        )}
        <Button variant="ghost" onClick={handleClose}>
          Close
        </Button>
      </>
    );
  } else if (app && project) {
    body = (
      <div className="space-y-4">
        <div className="checkerboard flex justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-surface-2 p-2">
          {output.url ? (
            project.mediaKind === "video" ? (
              <video
                data-testid="app-output"
                src={output.url}
                autoPlay={autoplayPreviews}
                muted
                loop
                playsInline
                controls
                aria-label={project.title}
                className="max-h-[55vh] w-auto max-w-full rounded-xl"
              />
            ) : (
              <img data-testid="app-output" src={output.url} alt={project.title} className="max-h-[55vh] w-auto max-w-full rounded-xl" />
            )
          ) : output.status === "loading" ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <p className="py-10 text-sm text-zinc-400">This output is no longer available.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-100">{project.title}</span>
          {showProviderBadges && <ProviderBadge source={project.providerSource} detail={project.providerDetail} size="sm" />}
          {project.width && project.height ? (
            <span>
              {project.width}×{project.height}
            </span>
          ) : null}
          {project.mediaKind === "video" && project.duration ? <span>{project.duration}s</span> : null}
          <span>{project.creditCost} credits</span>
        </div>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={runAgain} data-testid="app-run-again" leftIcon={<RotateCcw className="h-4 w-4" />}>
          Run again
        </Button>
        <Button variant="secondary" onClick={() => void download()} data-testid="app-download" leftIcon={<Download className="h-4 w-4" />}>
          Download
        </Button>
        <Button onClick={openInLibrary} data-testid="app-open-project" leftIcon={<FolderOpen className="h-4 w-4" />}>
          Open in library
        </Button>
      </>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} testId="app-run-modal" size="lg" title={app?.name} description={app?.tagline} footer={footer} initialFocusRef={initialFocusRef}>
      {body}
    </Modal>
  );
}
