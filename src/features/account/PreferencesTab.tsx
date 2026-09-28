import { useEffect, useRef } from "react";
import { useAccountStore } from "../../store/account-store";
import type { Preferences } from "../../store/account-store";
import { useUIStore } from "../../store/ui-store";
import type { GenerationType } from "../../types/project";
import { Card, SectionTitle, Select, Switch } from "../../components/ui";

const STUDIO_OPTIONS: Array<{ value: GenerationType; label: string }> = [
  { value: "image", label: "Image Studio" },
  { value: "video", label: "Video Studio" },
  { value: "cinema", label: "Cinema Studio" },
  { value: "lipsync", label: "LipSync Studio" },
  { value: "marketing", label: "Marketing Studio" },
];

const SAVE_TOAST_DELAY_MS = 600;

export function PreferencesTab() {
  const preferences = useAccountStore((s) => s.preferences);
  const setPreference = useAccountStore((s) => s.setPreference);
  const addToast = useUIStore((s) => s.addToast);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreference(key, value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      addToast("Preferences saved", { type: "success", duration: 2000 });
    }, SAVE_TOAST_DELAY_MS);
  };

  const describe = (text: string) => <span className="text-zinc-400">{text}</span>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-5">
        <SectionTitle hint={<span className="text-zinc-400">Saved automatically</span>}>Playback and display</SectionTitle>
        <Switch
          testId="pref-autoplay"
          label="Autoplay previews"
          description={describe("Start video outputs automatically in the studios and the library.")}
          checked={preferences.autoplayPreviews}
          onChange={(checked) => update("autoplayPreviews", checked)}
        />
        <Switch
          testId="pref-provider-badges"
          label="Show provider badges"
          description={describe("Label every output with the engine that produced it.")}
          checked={preferences.showProviderBadges}
          onChange={(checked) => update("showProviderBadges", checked)}
        />
        <Switch
          testId="pref-confirm-deletes"
          label="Confirm before deleting"
          description={describe("Ask before projects or files are removed.")}
          checked={preferences.confirmDeletes}
          onChange={(checked) => update("confirmDeletes", checked)}
        />
      </Card>

      <Card className="space-y-5">
        <SectionTitle>Defaults</SectionTitle>
        <Select
          testId="pref-default-studio"
          label="Default studio"
          hint={<span className="text-zinc-400">Opened by the Create button and the Explore composer.</span>}
          value={preferences.defaultStudio}
          onChange={(value) => update("defaultStudio", value as GenerationType)}
          options={STUDIO_OPTIONS}
        />
      </Card>
    </div>
  );
}
