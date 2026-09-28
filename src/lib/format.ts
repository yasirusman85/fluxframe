export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function slugify(input: string, maxLength = 48): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, maxLength)
      .replace(/-+$/g, "") || "untitled"
  );
}

/** Title-cases the first few words of a prompt for use as a project title. */
export function titleFromPrompt(prompt: string, fallback = "Untitled generation", maxLength = 48): string {
  // Collapse runs of spaces/tabs but keep newlines: a line break ends a clause.
  const clean = prompt.replace(/[^\S\n]+/g, " ").trim();
  if (!clean) return fallback;
  const collapse = (value: string) => value.replace(/\s+/g, " ").trim();
  const firstClause = collapse(clean.split(/[,.;:\n]/)[0]) || collapse(clean);
  const words = firstClause.split(" ");
  let title = "";
  for (const word of words) {
    if ((title + " " + word).trim().length > maxLength) break;
    title = (title + " " + word).trim();
  }
  if (!title) title = firstClause.slice(0, maxLength);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
