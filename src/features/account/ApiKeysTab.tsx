import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { maskApiKey, useAccountStore } from "../../store/account-store";
import type { ApiKey } from "../../store/account-store";
import { useUIStore } from "../../store/ui-store";
import { formatDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, IconButton, Input, Modal, SectionTitle } from "../../components/ui";

const API_ENDPOINT = "https://api.fluxframe.app/v1/generations";

function exampleRequest(key: string): string {
  return [
    `curl -X POST ${API_ENDPOINT} \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"type":"image","prompt":"Neon-lit street at dusk","model":"flux-realism-v2","aspectRatio":"16:9"}'`,
  ].join("\n");
}

export function ApiKeysTab() {
  const apiKeys = useAccountStore((s) => s.apiKeys);
  const createApiKey = useAccountStore((s) => s.createApiKey);
  const revokeApiKey = useAccountStore((s) => s.revokeApiKey);
  const deleteApiKey = useAccountStore((s) => s.deleteApiKey);
  const addToast = useUIStore((s) => s.addToast);

  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<ApiKey | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null);

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    const key = createApiKey(clean);
    setName("");
    setRevealed(key);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast("API key copied to your clipboard.", { type: "success" });
    } catch {
      addToast("Clipboard access was blocked. Select the key and copy it manually.", { type: "error" });
    }
  };

  const revoke = (key: ApiKey) => {
    revokeApiKey(key.id);
    addToast(`${key.name} revoked.`, { type: "info" });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteApiKey(pendingDelete.id);
    addToast(`${pendingDelete.name} deleted.`, { type: "info" });
    setPendingDelete(null);
  };

  const exampleKey = apiKeys.find((k) => !k.revoked);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionTitle hint={<span className="text-zinc-400">Local-only stubs</span>}>Create a key</SectionTitle>
        <p className="text-xs leading-relaxed text-zinc-400">
          FluxFrame runs entirely in your browser, so these keys are illustrative. They are generated and stored locally and never transmitted anywhere.
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <div className="flex-1">
            <Input testId="apikey-name-input" label="Key name" placeholder="e.g. CI pipeline" value={name} maxLength={40} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" data-testid="apikey-create" disabled={!name.trim()} leftIcon={<Plus className="h-4 w-4" />}>
            Create key
          </Button>
        </form>
      </Card>

      {apiKeys.length === 0 ? (
        <EmptyState compact icon={<KeyRound />} title="No API keys yet" description="Create a key to see how FluxFrame's API would be called. Keys never leave this browser." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul role="list" className="divide-y divide-zinc-800/80">
            {apiKeys.map((key) => (
              <li key={key.id} data-testid="apikey-row" className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{key.name}</span>
                    {key.revoked ? (
                      <Badge variant="rose" size="sm">
                        Revoked
                      </Badge>
                    ) : (
                      <Badge size="sm" dot>
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    <code className="font-mono text-zinc-300">{maskApiKey(key.key)}</code>
                    {" · "}created {formatDateTime(key.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button data-testid="apikey-revoke" variant="outline" size="sm" disabled={key.revoked} onClick={() => revoke(key)}>
                    {key.revoked ? "Revoked" : "Revoke"}
                  </Button>
                  <IconButton data-testid="apikey-delete" label={`Delete ${key.name}`} variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setPendingDelete(key)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-3">
        <SectionTitle hint={<span className="text-zinc-400">Illustrative — this endpoint does not exist</span>}>Example request</SectionTitle>
        <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-surface-2 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          <code>{exampleRequest(exampleKey ? maskApiKey(exampleKey.key) : "ff_live_…")}</code>
        </pre>
      </Card>

      <Modal
        open={revealed !== null}
        onClose={() => setRevealed(null)}
        testId="apikey-reveal"
        size="md"
        title="Copy your key now"
        description="The full key is only shown once. Store it somewhere safe."
        footer={
          <>
            <Button variant="secondary" data-testid="apikey-copy" leftIcon={<Copy className="h-4 w-4" />} onClick={() => revealed && void copy(revealed.key)}>
              Copy key
            </Button>
            <Button data-testid="apikey-reveal-close" onClick={() => setRevealed(null)}>
              Done
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-zinc-100">{revealed?.name}</span> is ready. Afterwards only the prefix and the last four characters are displayed.
          </p>
          <code data-testid="apikey-value" className="block break-all rounded-xl border border-zinc-800 bg-surface-2 p-3 font-mono text-sm text-brand-200">
            {revealed?.key}
          </code>
          <p className="text-xs text-zinc-400">Local sandbox: this key is not connected to any server.</p>
        </div>
      </Modal>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        testId="apikey-delete-confirm"
        size="sm"
        title="Delete this key?"
        description={pendingDelete ? `${pendingDelete.name} · ${maskApiKey(pendingDelete.key)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" data-testid="apikey-delete-confirm-button" onClick={confirmDelete}>
              Delete key
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">This removes the key from this browser. It cannot be recovered.</p>
      </Modal>
    </div>
  );
}
