import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { CreditCard, HardDrive, History, KeyRound, Settings2, User } from "lucide-react";
import { useAccountStore } from "../../store/account-store";
import { useCreditStore } from "../../store/credit-store";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Badge, Tabs } from "../../components/ui";
import { AccountAvatar } from "./AccountAvatar";
import { isAccountTab, planName } from "./account-tabs";
import type { AccountTab } from "./account-tabs";
import { ProfileTab } from "./ProfileTab";
import { PlansTab } from "./PlansTab";
import { HistoryTab } from "./HistoryTab";
import { ApiKeysTab } from "./ApiKeysTab";
import { PreferencesTab } from "./PreferencesTab";
import { StorageTab } from "./StorageTab";

const TABS: Array<{ id: AccountTab; label: string; icon: React.ReactNode }> = [
  { id: "profile", label: "Profile", icon: <User /> },
  { id: "plans", label: "Plans", icon: <CreditCard /> },
  { id: "history", label: "History", icon: <History /> },
  { id: "api", label: "API", icon: <KeyRound /> },
  { id: "preferences", label: "Preferences", icon: <Settings2 /> },
  { id: "storage", label: "Storage", icon: <HardDrive /> },
];

const PANELS: Record<AccountTab, () => React.ReactElement> = {
  profile: ProfileTab,
  plans: PlansTab,
  history: HistoryTab,
  api: ApiKeysTab,
  preferences: PreferencesTab,
  storage: StorageTab,
};

export function AccountPage() {
  useDocumentTitle("Account");
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("tab");
  const tab: AccountTab = isAccountTab(param) ? param : "profile";

  const setTab = useCallback(
    (id: string) => {
      if (!isAccountTab(id)) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const { displayName, handle, avatarHue } = useAccountStore(useShallow((s) => ({ displayName: s.displayName, handle: s.handle, avatarHue: s.avatarHue })));
  const { planId, balance } = useCreditStore(useShallow((s) => ({ planId: s.planId, balance: s.balance })));
  const Panel = PANELS[tab];
  const label = TABS.find((t) => t.id === tab)?.label ?? "Profile";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8 animate-fade-in">
      <header className="flex flex-wrap items-center gap-4 border-b border-zinc-800/80 pb-5">
        <AccountAvatar name={displayName} hue={avatarHue} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-white md:text-2xl">{displayName || "FluxFrame user"}</h1>
          <p className="truncate text-sm text-zinc-400">@{handle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand" data-testid="account-plan">
            {planName(planId)}
          </Badge>
          <Badge variant="amber" data-testid="account-credits">
            <span className="font-mono tabular-nums">{balance.toLocaleString()}</span> credits
          </Badge>
        </div>
      </header>

      <Tabs ariaLabel="Account sections" tabs={TABS} value={tab} onChange={setTab} testIdPrefix="account-tab" />

      <div key={tab} role="tabpanel" aria-label={label} className="animate-fade-in">
        <Panel />
      </div>
    </div>
  );
}
