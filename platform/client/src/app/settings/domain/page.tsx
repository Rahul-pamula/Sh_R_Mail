"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Copy, Plus, Activity, RefreshCw, Globe, CheckCircle2, ShieldAlert, X, Lock, ChevronDown, ChevronUp } from 'lucide-react';
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
            const res = await fetch(`${API_BASE}/domains/?t=${Date.now()}`, {
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
function FranchiseDomainView({ domains }: any) {
    const [expandedId, setExpandedId] = useState<string | null>(domains[0]?.id || null);

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-20">
            {/* Header & Info */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
                <div className="flex flex-col justify-center">
                    <PageHeader
                        title="Sending Domains"
                        subtitle="View the sending infrastructure managed by your main workspace."
                    />
                </div>
                <div className="flex items-center justify-end">
                    <div className="flex items-center gap-4 px-6 py-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</span>
                            <span className="text-sm font-bold text-[var(--success)]">Managed</span>
                        </div>
                        <div className="w-px h-8 bg-[var(--border)]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Verified</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                                {domains.filter((d: any) => d.status === 'verified').length} / {domains.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <InlineAlert 
                variant="info" 
                title="Managed Infrastructure" 
                description="This infrastructure is centrally managed. You have full use of these domains for your campaigns, but configuration changes must be made by the main workspace administrator." 
            />

            {domains.length === 0 ? (
                <EmptyState
                    icon={<Globe className="h-12 w-12 text-[var(--text-muted)]" />}
                    title="No domains shared"
                    description="No domains have been allocated to your franchise yet. Please contact your administrator."
                />
            ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Allocated Domains</h3>
                    {domains.map((domain: any) => {
                        const isExpanded = expandedId === domain.id;
                        const statusVariant = domain.status === 'verified' ? 'success' : domain.status === 'failed' ? 'danger' : 'warning';
                        
                        return (
                            <div 
                                key={domain.id}
                                className={`group rounded-[var(--radius-xl)] border transition-all duration-300 overflow-hidden ${
                                    isExpanded 
                                        ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xl ring-1 ring-[var(--accent)]' 
                                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                                }`}
                            >
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : domain.id)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                                            isExpanded ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20' : 'bg-[var(--bg-hover)] border-[var(--border)]'
                                        }`}>
                                            <Globe className={`h-6 w-6 ${isExpanded ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-lg font-black text-[var(--text-primary)]">
                                                    {domain.domain_name}
                                                </span>
                                                <Badge variant={statusVariant} className="text-[10px] py-0 px-2 h-5">
                                                    {domain.status === 'verified' ? 'Active' : 'Pending'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Managed by Administrator
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                        <ChevronDown className="h-6 w-6" />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="pt-6 border-t border-[var(--border)] space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-hover)]/40 border border-[var(--border)] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Status</p>
                                                        <p className="text-lg font-bold text-[var(--success)]">Ready for Sending</p>
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                                                </div>
                                                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-hover)]/40 border border-[var(--border)] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Workspace Link</p>
                                                        <p className="text-lg font-bold text-[var(--text-primary)]">Isolated & Managed</p>
                                                    </div>
                                                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                                                </div>
                                            </div>

                                            <SectionCard title="Technical Records">
                                                <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--bg-hover)]/20 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]">
                                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
                                                        <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                                                    </div>
                                                    <h4 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">Configuration Managed by Admin</h4>
                                                    <p className="text-sm text-[var(--text-muted)] max-w-[320px]">
                                                        DKIM and SPF records are handled at the global level to maintain peak deliverability. No local configuration is required.
                                                    </p>
                                                </div>
                                            </SectionCard>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
    const [expandedId, setExpandedId] = useState<string | null>(domains[0]?.id || null);
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
        try {
            const res = await fetch(`${API_BASE}/domains/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                success('Domain removed successfully');
                setSelectedDomain(null);
                setPendingRemoveId(null);
                refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                error(data.detail || 'Failed to remove domain');
            }
        } catch (err) {
            error('Error connecting to the server');
        } finally {
            setPendingRemoveId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        success('Copied');
    };

    const selectedStatusVariant = selectedDomain?.status === 'verified' ? 'success' : selectedDomain?.status === 'failed' ? 'danger' : 'warning';

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-20">
            {/* Metrics & Header */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
                <div className="flex flex-col justify-center">
                    <PageHeader
                        title="Sending Domains"
                        subtitle="Manage sending infrastructure for your entire workspace."
                    />
                </div>
                <div className="flex items-center justify-end gap-3">
                    <div className="flex items-center gap-4 px-6 py-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            <span className="text-xl font-bold text-[var(--text-primary)]">{domains.length}</span>
                        </div>
                        <div className="w-px h-8 bg-[var(--border)]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Verified</span>
                            <span className="text-xl font-bold text-[var(--success)]">{domains.filter((d: any) => d.status === 'verified').length}</span>
                        </div>
                    </div>
                    {can(user, 'domains:add') && (
                        <Button onClick={() => setShowAddModal(true)} className="h-14 px-6">
                            <Plus className="h-4 w-4" />
                            Add Domain
                        </Button>
                    )}
                </div>
            </div>

            {domains.length === 0 ? (
                <EmptyState
                    icon={<Globe className="h-12 w-12 text-[var(--accent)]" />}
                    title="No domains connected"
                    description="Connect a domain to start sending emails with high deliverability."
                    action={<Button onClick={() => setShowAddModal(true)} size="lg">Connect Your First Domain</Button>}
                />
            ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Connected Domains</h3>
                    {domains.map((domain: any) => {
                        const isExpanded = expandedId === domain.id;
                        const statusVariant = domain.status === 'verified' ? 'success' : domain.status === 'failed' ? 'danger' : 'warning';
                        
                        return (
                            <div 
                                key={domain.id}
                                className={`group rounded-[var(--radius-xl)] border transition-all duration-300 overflow-hidden ${
                                    isExpanded 
                                        ? 'border-[var(--accent)] bg-[var(--bg-card)] shadow-xl ring-1 ring-[var(--accent)]' 
                                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
                                }`}
                            >
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : domain.id)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                                            isExpanded ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20' : 'bg-[var(--bg-hover)] border-[var(--border)]'
                                        }`}>
                                            <Globe className={`h-6 w-6 ${isExpanded ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-lg font-black text-[var(--text-primary)]">
                                                    {domain.domain_name}
                                                </span>
                                                <Badge variant={statusVariant} className="text-[10px] py-0 px-2 h-5">
                                                    {domain.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Added {new Date(domain.created_at || Date.now()).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                        <ChevronDown className="h-6 w-6" />
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="pt-6 border-t border-[var(--border)] space-y-8">
                                            {/* Metrics Row */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-hover)]/40 border border-[var(--border)] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Reputation</p>
                                                        <p className="text-lg font-bold text-[var(--text-primary)]">Neutral</p>
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
                                                </div>
                                                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-hover)]/40 border border-[var(--border)] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">DKIM Setup</p>
                                                        <p className={`text-lg font-bold ${domain.status === 'verified' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                                                            {domain.status === 'verified' ? 'Healthy' : 'Pending'}
                                                        </p>
                                                    </div>
                                                    {domain.status === 'verified' ? (
                                                        <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                                                    ) : (
                                                        <Activity className="h-5 w-5 text-[var(--warning)] animate-pulse" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* DNS Records */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-primary)]">DNS Configuration</h3>
                                                    {domain.status === 'verified' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowDnsRecords(!showDnsRecords);
                                                            }}
                                                            className="text-xs h-8"
                                                        >
                                                            {showDnsRecords ? 'Hide Records' : 'View Records'}
                                                        </Button>
                                                    )}
                                                </div>

                                                {(domain.status !== 'verified' || showDnsRecords) && (
                                                    <div className="grid gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <div className="space-y-3">
                                                            <p className="text-xs font-medium text-[var(--text-muted)] px-1">DKIM CNAME Records</p>
                                                            <DnsTable
                                                                rows={(domain.dkim_tokens || []).map((token: string) => ({
                                                                    type: 'CNAME',
                                                                    host: `${token}._domainkey`,
                                                                    value: `${token}.dkim.amazonses.com`,
                                                                }))}
                                                                onCopy={copyToClipboard}
                                                            />
                                                        </div>

                                                        <div className="space-y-3">
                                                            <p className="text-xs font-medium text-[var(--text-muted)] px-1">SPF TXT Record</p>
                                                            <DnsTable
                                                                rows={[{ type: 'TXT', host: '@', value: 'v=spf1 include:amazonses.com ~all' }]}
                                                                onCopy={copyToClipboard}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {domain.status !== 'verified' && can(user, 'domains:verify') && (
                                                    <div className="pt-4">
                                                        <Button 
                                                            size="lg" 
                                                            fullWidth
                                                            onClick={() => handleVerify(domain)}
                                                            className="shadow-lg shadow-[var(--accent)]/20"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                            Run Verification Check
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Danger Zone */}
                                            {can(user, 'domains:delete') && (
                                                <div className="pt-6 mt-6 border-t border-[var(--border)]">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[var(--radius-lg)] bg-red-500/5 border border-red-500/20">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-red-500 mb-1 flex items-center gap-2">
                                                                <ShieldAlert className="w-4 h-4" />
                                                                Danger Zone
                                                            </h4>
                                                            <p className="text-[11px] text-[var(--text-muted)] max-w-sm">
                                                                Disconnecting this domain will stop all active campaigns using it.
                                                            </p>
                                                        </div>
                                                        <Button 
                                                            variant="danger" 
                                                            size="sm"
                                                            onClick={() => setPendingRemoveId(domain.id)}
                                                            className="mt-4 md:mt-0"
                                                        >
                                                            Disconnect Domain
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
