'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Key, ArrowLeft, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

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

    const fetchKeys = async () => {
        if (!token) return;
        const res = await fetch(`${API_BASE}/settings/api-keys`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const d = await res.json();
            setKeys(d.api_keys || []);
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
            const d = await res.json();
            setNewKey(d.key);
            setNewKeyName('');
            setShowCreate(false);
            await fetchKeys();
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
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

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-8 lg:p-12">
            <div className="max-w-3xl mx-auto">
                <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>

                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                                <Key className="w-5 h-5 text-rose-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">API Keys</h1>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm">Generate secret keys to use the Email Engine API in your own applications.</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(v => !v)}
                        className="btn-premium px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Key
                    </button>
                </div>

                {/* New Key Revealed Panel */}
                {newKey && (
                    <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-start gap-3 mb-3">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-400">API key created!</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Copy it now — this is the only time you'll see the full key.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-input)] text-emerald-600 dark:text-emerald-300 text-xs font-mono break-all border border-emerald-500/20">
                                {newKey}
                            </code>
                            <button
                                onClick={copyKey}
                                className="flex-shrink-0 px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            I've copied it, dismiss
                        </button>
                    </div>
                )}

                {/* Create Key Form */}
                {showCreate && (
                    <div className="mb-6 p-5 glass-panel">
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Create New API Key</p>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)] transition-colors outline-none"
                                placeholder='e.g. "Production App" or "CI/CD Pipeline"'
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newKeyName.trim()}
                                className="btn-premium px-5 py-2.5 text-sm disabled:opacity-60"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Keys List */}
                <div className="glass-panel overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <Key className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                            <p className="text-[var(--text-muted)] text-sm">No API keys yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Key</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Created</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Last Used</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map((key, i) => (
                                    <tr key={key.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{key.name}</td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-input)] px-2 py-1 rounded">
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
                                            <button
                                                onClick={() => handleRevoke(key.id)}
                                                disabled={revoking === key.id}
                                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Revoke key"
                                            >
                                                {revoking === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-secondary)]">Usage:</span> Include your API key in the <code className="bg-[var(--bg-input)] px-1 py-0.5 rounded text-[var(--accent)]">Authorization: Bearer ee_...</code> header when making API calls.
                    </p>
                </div>
            </div>
        </div>
    );
}
