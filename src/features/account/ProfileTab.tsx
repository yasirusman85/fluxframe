import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Save, Undo2 } from "lucide-react";
import { useAccountStore } from "../../store/account-store";
import { useUIStore } from "../../store/ui-store";
import { Button, Card, Input, SectionTitle, Slider, Textarea } from "../../components/ui";
import { AccountAvatar } from "./AccountAvatar";

const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIO_MAX = 160;

interface Draft {
  displayName: string;
  handle: string;
  email: string;
  bio: string;
  avatarHue: number;
}

export function ProfileTab() {
  const profile = useAccountStore(
    useShallow((s): Draft => ({ displayName: s.displayName, handle: s.handle, email: s.email, bio: s.bio, avatarHue: s.avatarHue })),
  );
  const updateProfile = useAccountStore((s) => s.updateProfile);
  const addToast = useUIStore((s) => s.addToast);
  const [draft, setDraft] = useState<Draft>(profile);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const nameError = draft.displayName.trim() ? undefined : "Add a display name.";
  const handleError = HANDLE_RE.test(draft.handle) ? undefined : "Use 3–24 lowercase letters, numbers or underscores.";
  const emailError = !draft.email.trim() || EMAIL_RE.test(draft.email.trim()) ? undefined : "That does not look like an email address.";
  const hasErrors = Boolean(nameError || handleError || emailError);
  const dirty =
    draft.displayName !== profile.displayName ||
    draft.handle !== profile.handle ||
    draft.email !== profile.email ||
    draft.bio !== profile.bio ||
    draft.avatarHue !== profile.avatarHue;

  const save = () => {
    if (hasErrors) return;
    updateProfile({
      displayName: draft.displayName.trim(),
      handle: draft.handle.trim(),
      email: draft.email.trim(),
      bio: draft.bio.slice(0, BIO_MAX),
      avatarHue: draft.avatarHue,
    });
    addToast("Profile saved", { type: "success" });
  };

  const discard = () => setDraft(profile);

  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[280px_1fr]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Card className="space-y-5">
        <SectionTitle>Avatar</SectionTitle>
        <div className="flex flex-col items-center gap-3 text-center">
          <AccountAvatar name={draft.displayName} hue={draft.avatarHue} size="xl" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">{draft.displayName.trim() || "Your name"}</p>
            <p className="text-xs text-zinc-400">@{draft.handle || "handle"}</p>
          </div>
        </div>
        <Slider label="Avatar colour" min={0} max={360} value={draft.avatarHue} onChange={(value) => set("avatarHue", value)} formatValue={(value) => `${value}°`} testId="profile-hue-slider" />
        <p className="text-xs text-zinc-400">Initials are taken from your display name. The gradient follows the hue you pick.</p>
      </Card>

      <Card className="space-y-5">
        <SectionTitle hint={<span className="text-zinc-400">Stored in this browser only</span>}>Profile</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input testId="profile-name-input" label="Display name" value={draft.displayName} maxLength={40} autoComplete="name" error={nameError} onChange={(e) => set("displayName", e.target.value)} />
          <Input
            testId="profile-handle-input"
            label="Handle"
            value={draft.handle}
            maxLength={24}
            autoComplete="username"
            leftIcon={<span className="text-sm font-semibold">@</span>}
            error={handleError}
            hint={<span className="text-zinc-400">Lowercase letters, numbers and underscores.</span>}
            onChange={(e) => set("handle", e.target.value)}
          />
        </div>
        <Input
          testId="profile-email-input"
          type="email"
          label={
            <>
              Email <span className="font-normal text-zinc-400">(optional)</span>
            </>
          }
          value={draft.email}
          autoComplete="email"
          placeholder="you@example.com"
          error={emailError}
          onChange={(e) => set("email", e.target.value)}
        />
        <Textarea
          testId="profile-bio-input"
          label="Bio"
          value={draft.bio}
          rows={3}
          maxLength={BIO_MAX}
          showCount
          placeholder="What are you making?"
          onChange={(e) => set("bio", e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 pt-4">
          {dirty && <span className="mr-auto text-xs text-amber-300">Unsaved changes</span>}
          <Button type="button" variant="ghost" onClick={discard} disabled={!dirty} leftIcon={<Undo2 className="h-4 w-4" />}>
            Discard
          </Button>
          <Button type="submit" data-testid="profile-save" disabled={!dirty || hasErrors} leftIcon={<Save className="h-4 w-4" />}>
            Save changes
          </Button>
        </div>
      </Card>
    </form>
  );
}
