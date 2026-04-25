'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Key, Plus, Trash2, Copy, Check, Loader2, Shield } from 'lucide-react';
import { Badge, Button, ConfirmModal, EmptyState, InlineAlert, Input, KeyValueList, PageHeader, SectionCard, StatCard, TableToolbar } from '@/components/ui';

const API_BASE = 'http://127.0.0.1:8000';

type ApiKey = {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at: string | null;
};

export default function ApiKeysSettings() {
    const { token } = useAuth();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

    const fetchKeys = async () => {
        if (!token) return;
        const res = await fetch(`${API_BASE}/settings/api-keys`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            setKeys(data.api_keys || []);
        }
        setLoading(false);
    };

    useEffect(() => { fetchKeys(); }, [token]);

    const handleCreate = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/settings/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: newKeyName.trim() }),
            });
            const data = await res.json();
            setNewKey(data.key);
            setNewKeyName('');
            setShowCreate(false);
            await fetchKeys();
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        setRevoking(id);
        try {
            await fetch(`${API_BASE}/settings/api-keys/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchKeys();
        } finally {
            setRevoking(null);
        }
    };

    const copyKey = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const summaryMetrics = [
        { label: 'Keys', value: keys.length.toString() },
        { label: 'Recently Used', value: keys.filter((key) => !!key.last_used_at).length.toString() },
        { label: 'Never Used', value: keys.filter((key) => !key.last_used_at).length.toString() },
        { label: 'Pending Create', value: showCreate ? '1' : '0' },
    ];

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="API Keys"
                subtitle="Issue scoped credentials for production, staging, and internal tooling without mixing operational and administrative work."
                action={
                    <Button onClick={() => setShowCreate((value) => !value)}>
                        <Plus className="h-4 w-4" />
                        New Key
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryMetrics.map((metric) => (
                    <StatCard key={metric.label} label={metric.label} value={metric.value} />
                ))}
            </div>

            {newKey && (
                <InlineAlert
                    variant="success"
                    title="API key created"
                    description="Copy it now. This is the only time the full secret will be visible."
                    icon={<Check className="mt-0.5 h-4 w-4" />}
                >
                    <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded-[var(--radius)] border border-[var(--success-border)] bg-[var(--bg-input)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                            {newKey}
                        </code>
                        <button
                            onClick={copyKey}
                            className="rounded-[var(--radius)] border border-[var(--success-border)] px-3 py-2 text-[var(--success)] transition hover:bg-[var(--success-bg)]"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3" onClick={() => setNewKey(null)}>
                        I’ve copied it
                    </Button>
                </InlineAlert>
            )}

            {showCreate && (
                <SectionCard
                    title="Create New API Key"
                    description="Name keys by environment or owner so rotation, revocation, and audit trails stay obvious later."
                >
                    <div className="flex gap-3">
                        <Input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className="flex-1"
                            placeholder='e.g. "Production App" or "CI/CD Pipeline"'
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                        </Button>
                    </div>
                </SectionCard>
            )}

            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)]">
                <TableToolbar
                    title="Issued Keys"
                    description="Separate keys by environment or integration so revocation stays low-risk."
                    trailing={keys.length > 0 ? <Badge variant="outline">{keys.length} active records</Badge> : null}
                    className="rounded-none border-0 border-b border-[var(--border)]"
                />
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
                    </div>
                ) : keys.length === 0 ? (
                    <EmptyState
                        icon={<Key className="h-10 w-10" />}
                        title="No API keys yet"
                        description="Create a dedicated key for each integration surface so you can rotate credentials without collateral damage."
                        action={<Button onClick={() => setShowCreate(true)}>Create API Key</Button>}
                    />
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Key</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Last Used</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key) => (
                                <tr key={key.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]">
                                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{key.name}</td>
                                    <td className="px-6 py-4">
                                        <code className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-xs text-[var(--text-muted)]">
                                            {key.key_prefix}•••••••••
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                                        {new Date(key.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={key.last_used_at ? 'success' : 'outline'}>
                                            {key.last_used_at ? 'Active' : 'Unused'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setPendingRevokeId(key.id)}
                                            disabled={revoking === key.id}
                                            className="rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                                            title="Revoke key"
                                        >
                                            {revoking === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <SectionCard title="Usage Guidance" description="Keep authentication patterns consistent across SDKs, internal tooling, and partner integrations.">
                <KeyValueList
                    columns={1}
                    items={[
                        {
                            label: 'Authorization header',
                            value: <code className="rounded bg-[var(--bg-input)] px-1 py-0.5 font-mono text-xs text-[var(--accent)]">Authorization: Bearer ee_...</code>,
                            helper: 'Use a unique key per environment so rotation is low-risk and audit history stays useful.',
                        },
                    ]}
                />
            </SectionCard>

            <ConfirmModal
                isOpen={!!pendingRevokeId}
                onClose={() => setPendingRevokeId(null)}
                onConfirm={() => {
                    if (!pendingRevokeId) return;
                    const current = pendingRevokeId;
                    setPendingRevokeId(null);
                    void handleRevoke(current);
                }}
                title="Revoke API Key?"
                message="This key will stop working immediately and cannot be recovered."
                confirmLabel="Revoke Key"
                variant="danger"
            />
        </div>
    );
}
