"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Copy, Plus, Activity, RefreshCw, Globe, CheckCircle2, ShieldAlert, X, Lock } from 'lucide-react';
import { can } from '@/utils/permissions';
import { useRouter } from 'next/navigation';
import { useToast, Badge, Button, ConfirmModal, EmptyState, InlineAlert, InspectorPanel, KeyValueList, PageHeader, SectionCard, StatCard, PageLoader } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function CodeRow({ value, onCopy }: { value: string; onCopy: (value: string) => void }) {
    return (
        <div className="flex min-w-[180px] items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-primary)]">
            <span className="min-w-0 break-all whitespace-pre-wrap">{value}</span>
            <button
                onClick={() => onCopy(value)}
                className="flex-shrink-0 rounded-[var(--radius)] p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            >
                <Copy className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function DnsTable({
    rows,
    includePriority = false,
    onCopy,
}: {
    rows: Array<{ type: string; host: string; value: string; priority?: string }>;
    includePriority?: boolean;
    onCopy: (value: string) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]">
            <table className="min-w-[760px] w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Host / Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Value / Target</th>
                        {includePriority && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Priority</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.type}-${row.host}-${index}`} className="border-b border-[var(--border)] last:border-b-0">
                            <td className="whitespace-nowrap px-4 py-4 text-[var(--text-primary)]">{row.type}</td>
                            <td className="px-4 py-4 align-top"><CodeRow value={row.host} onCopy={onCopy} /></td>
                            <td className="px-4 py-4 align-top"><CodeRow value={row.value} onCopy={onCopy} /></td>
                            {includePriority && <td className="whitespace-nowrap px-4 py-4 text-[var(--text-primary)]">{row.priority ?? '-'}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function DomainSettingsPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const { success, error, info } = useToast();

    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<any[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<any>(null);

    useEffect(() => {
        if (user && !can(user, 'domains:view')) {
            router.replace('/dashboard');
        }
    }, [user, router]);

    const fetchDomains = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/domains/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const nextDomains = data.data || [];
                setDomains(nextDomains);
                setSelectedDomain((current: any) => current ? nextDomains.find((entry: any) => entry.id === current.id) || nextDomains[0] || null : nextDomains[0] || null);
            }
        } catch {
            error('Failed to load domains');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDomains();
    }, [token]);

    if (!user || !can(user, 'domains:view')) return null;
    if (loading) return <PageLoader label="Sending Domains" />;

    if (user.workspaceType === 'FRANCHISE') {
        return (
            <FranchiseDomainView 
                domains={domains} 
                selectedDomain={selectedDomain} 
                setSelectedDomain={setSelectedDomain} 
            />
        );
    }

    return (
        <MainDomainManagement 
            domains={domains} 
            selectedDomain={selectedDomain} 
            setSelectedDomain={setSelectedDomain}
            refresh={fetchDomains}
        />
    );
}

/* ============================================================
   FRANCHISE VIEW (Read-Only Fork)
   ============================================================ */
function FranchiseDomainView({ domains, selectedDomain, setSelectedDomain }: any) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const selectedStatusVariant = selectedDomain?.status === 'verified' ? 'success' : selectedDomain?.status === 'failed' ? 'danger' : 'warning';

    const summaryMetrics = [
        { label: 'Domains', value: domains.length.toString() },
        { label: 'Verified', value: domains.filter((domain: any) => domain.status === 'verified').length.toString() },
        { label: 'Infrastructure', value: 'Managed' },
        { label: 'DKIM Status', value: selectedDomain?.status || '-' },
    ];

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <PageHeader
                title="Sending Domains"
                subtitle="View the sending infrastructure managed by your main workspace."
            />

            <InlineAlert 
                variant="info" 
                title="Managed Infrastructure" 
                description="This domain is managed by your main workspace. You can view details but cannot make changes." 
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryMetrics.map((metric) => (
                    <StatCard key={metric.label} label={metric.label} value={metric.value} />
                ))}
            </div>

            {domains.length === 0 ? (
                <EmptyState
                    icon={<Globe className="h-10 w-10" />}
                    title="No domains shared"
                    description="No domains have been shared with your franchise yet. Contact your main workspace owner."
                />
            ) : (
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-3">
                        {domains.map((domain: any) => (
                            <button
                                key={domain.id}
                                onClick={() => setSelectedDomain(domain)}
                                className={`w-full rounded-[var(--radius-lg)] border p-4 text-left transition ${
                                    selectedDomain?.id === domain.id
                                        ? 'border-[var(--accent-border)] bg-[var(--accent)]/8'
                                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                                }`}
                            >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <strong className="text-sm text-[var(--text-primary)]">{domain.domain_name}</strong>
                                    {domain.status === 'verified' ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <Activity className="h-4 w-4 text-[var(--warning)]" />}
                                </div>
                                <Badge variant={domain.status === 'verified' ? 'success' : 'warning'}>
                                    {domain.status === 'verified' ? 'Verified' : 'Pending'}
                                </Badge>
                            </button>
                        ))}
                    </div>

                    {selectedDomain && (
                        <div className="space-y-6 pointer-events-none opacity-80">
                            <InspectorPanel
                                title={selectedDomain.domain_name}
                                badge={<Badge variant={selectedStatusVariant}>{selectedDomain.status}</Badge>}
                                subtitle="Records configured by the main workspace."
                            >
                                <KeyValueList items={[
                                    { label: 'Verification state', value: selectedDomain.status },
                                    { label: 'Workspace reuse', value: 'Active' },
                                ]} />
                            </InspectorPanel>

                            <SectionCard title="DKIM Records" description="DNS records currently published for this domain.">
                                <DnsTable
                                    rows={(selectedDomain.dkim_tokens || []).map((token: string) => ({
                                        type: 'CNAME',
                                        host: `${token}._domainkey`,
                                        value: `${token}.dkim.amazonses.com`,
                                    }))}
                                    onCopy={copyToClipboard}
                                />
                            </SectionCard>
                            
                            <SectionCard title="SPF Record">
                                <DnsTable
                                    rows={[{ type: 'TXT', host: '@', value: 'v=spf1 include:amazonses.com ~all' }]}
                                    onCopy={copyToClipboard}
                                />
                            </SectionCard>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   MAIN MANAGEMENT VIEW (Full Access Fork)
   ============================================================ */
function MainDomainManagement({ domains, selectedDomain, setSelectedDomain, refresh }: any) {
    const { token, user } = useAuth();
    const { success, error, info } = useToast();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);
    const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
    const [showDnsRecords, setShowDnsRecords] = useState(false);

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch(`${API_BASE}/domains/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ domain_name: newDomain.toLowerCase().trim() }),
            });
            if (res.ok) {
                success('Domain added');
                setShowAddModal(false);
                setNewDomain('');
                refresh();
            } else {
                const d = await res.json();
                error(d.detail || 'Failed');
            }
        } catch { error('Error'); } finally { setAdding(false); }
    };

    const handleVerify = async (domain: any) => {
        info('Verifying...');
        const res = await fetch(`${API_BASE}/domains/${domain.id}/verify`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            success('Checked');
            refresh();
        }
    };

    const handleRemove = async (id: string) => {
        await fetch(`${API_BASE}/domains/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        success('Removed');
        refresh();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        success('Copied');
    };

    const selectedStatusVariant = selectedDomain?.status === 'verified' ? 'success' : selectedDomain?.status === 'failed' ? 'danger' : 'warning';

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-20">
            <PageHeader
                title="Sending Domains"
                subtitle="Manage sending infrastructure for your entire workspace."
                action={
                    can(user, 'domains:add') ? (
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus className="h-4 w-4" />
                            Add Domain
                        </Button>
                    ) : null
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total" value={domains.length.toString()} />
                <StatCard label="Verified" value={domains.filter((d: any) => d.status === 'verified').length.toString()} />
            </div>

            {domains.length === 0 ? (
                <EmptyState
                    icon={<Globe className="h-10 w-10" />}
                    title="No domains"
                    action={<Button onClick={() => setShowAddModal(true)}>Connect Domain</Button>}
                />
            ) : (
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-3">
                        {domains.map((domain: any) => (
                            <button
                                key={domain.id}
                                onClick={() => setSelectedDomain(domain)}
                                className={`w-full rounded-[var(--radius-lg)] border p-4 text-left transition ${
                                    selectedDomain?.id === domain.id ? 'border-[var(--accent-border)] bg-[var(--accent)]/8' : 'border-[var(--border)] bg-[var(--bg-card)]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{domain.domain_name}</span>
                                    <Badge variant={domain.status === 'verified' ? 'success' : 'warning'}>{domain.status}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedDomain && (
                        <div className="space-y-6">
                            <InspectorPanel
                                title={selectedDomain.domain_name}
                                badge={<Badge variant={selectedStatusVariant}>{selectedDomain.status}</Badge>}
                                action={selectedDomain.status !== 'verified' && can(user, 'domains:verify') && (
                                    <Button variant="outline" onClick={() => handleVerify(selectedDomain)}>
                                        <RefreshCw className="h-4 w-4" />
                                        Verify
                                    </Button>
                                )}
                            >
                                <KeyValueList items={[{ label: 'Status', value: selectedDomain.status }]} />
                            </InspectorPanel>

                            {/* DNS Configuration Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">DNS Configuration</h3>
                                    {selectedDomain.status === 'verified' && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setShowDnsRecords(!showDnsRecords)}
                                        >
                                            {showDnsRecords ? 'Hide' : 'View'} Records
                                        </Button>
                                    )}
                                </div>

                                {(selectedDomain.status !== 'verified' || showDnsRecords) && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                                        <SectionCard title="DKIM Records">
                                            <DnsTable
                                                rows={(selectedDomain.dkim_tokens || []).map((token: string) => ({
                                                    type: 'CNAME',
                                                    host: `${token}._domainkey`,
                                                    value: `${token}.dkim.amazonses.com`,
                                                }))}
                                                onCopy={copyToClipboard}
                                            />
                                        </SectionCard>

                                        <SectionCard title="SPF Record">
                                            <DnsTable
                                                rows={[{ type: 'TXT', host: '@', value: 'v=spf1 include:amazonses.com ~all' }]}
                                                onCopy={copyToClipboard}
                                            />
                                        </SectionCard>
                                    </div>
                                )}
                            </div>

                            {can(user, 'domains:delete') && (
                                <SectionCard tone="danger" title="Danger Zone">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[var(--text-muted)]">Remove this domain from your workspace.</p>
                                        <Button variant="danger" onClick={() => setPendingRemoveId(selectedDomain.id)}>Remove</Button>
                                    </div>
                                </SectionCard>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Connect Domain</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAddDomain} className="space-y-4">
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                            />
                            <Button type="submit" disabled={adding} fullWidth>
                                {adding ? 'Generating...' : 'Add Domain'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!pendingRemoveId}
                onClose={() => setPendingRemoveId(null)}
                onConfirm={() => pendingRemoveId && handleRemove(pendingRemoveId)}
                title="Remove Domain?"
                message="Are you sure?"
                confirmLabel="Remove"
                variant="danger"
            />
        </div>
    );
}
