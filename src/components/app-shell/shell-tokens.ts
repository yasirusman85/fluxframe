/** Shared shell constants and class recipes (kept out of component files for fast refresh). */

/** Balance below which credit indicators switch to the amber "low" tone. */
export const LOW_CREDITS_THRESHOLD = 50;

export const isLowBalance = (balance: number): boolean => balance < LOW_CREDITS_THRESHOLD;

const linkButtonBase =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors select-none [&>svg]:h-4 [&>svg]:w-4";

/** `<Link>`/`<a>` styled like `<Button variant="primary">`. */
export const primaryLinkButton = `${linkButtonBase} border border-brand-400/40 bg-brand-500 text-zinc-950 hover:bg-brand-400 shadow-[0_8px_24px_-10px_rgb(16_185_129/0.7)]`;

/** `<Link>`/`<a>` styled like `<Button variant="secondary">`. */
export const secondaryLinkButton = `${linkButtonBase} border border-zinc-700/70 bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700/90`;
