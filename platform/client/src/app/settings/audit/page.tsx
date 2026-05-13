'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, History, Shield, Users, Calendar, Search, Filter, Info, ChevronRight, Key, Mail, Store, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, PageHeader, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type AuditFilter = 'all' | 'team.' | 'franchise.' | 'auth.' | 'campaign.' | 'template.' | 'contact.';

interface AuditActor {
    user_id?: string | null;
    email?: string | null;
    full_name?: string | null;
}

interface AuditEntry {
    id: string;
    action: string;
    user_id?: string | null;
    resource_type?: string | null;
    resource_id?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    actor?: AuditActor | null;
}

const FILTERS: Array<{ label: string; value: AuditFilter; icon: React.ReactNode }> = [
    { label: 'All activity', value: 'all', icon: <History className="h-4 w-4" /> },
    { label: 'Security & Auth', value: 'auth.', icon: <Key className="h-4 w-4" /> },
    { label: 'Team access', value: 'team.', icon: <Users className="h-4 w-4" /> },
    { label: 'Campaigns', value: 'campaign.', icon: <Mail className="h-4 w-4" /> },
    { label: 'Workspaces', value: 'franchise.', icon: <Store className="h-4 w-4" /> },
];

function summarizeAction(action: string) {
    const parts = action.split('.');
    const category = parts[0];
    const event = parts[1] || '';

    switch (action) {
        case 'team.invite_sent': return 'Invitation sent';
        case 'team.invite_resent': return 'Invitation resent';
        case 'team.invite_canceled': return 'Invitation canceled';
        case 'team.invite_accepted': return 'Invitation accepted';
        case 'team.member_removed': return 'Member removed';
        case 'team.member_left': return 'Member left workspace';
        case 'team.member_updated': return 'Permissions updated';
        case 'team.ownership_transferred': return 'Ownership transferred';
        case 'team.export': return 'Team data exported';
        case 'franchise.created': return 'Franchise workspace created';
        case 'franchise.suspended': return 'Franchise suspended';
        case 'franchise.reactivated': return 'Franchise reactivated';
        case 'franchise.deleted': return 'Franchise deleted';
        case 'auth.login': return 'User login';
        case 'auth.logout': return 'User logout';
        case 'auth.signup': return 'New account signup';
        case 'campaign.send': return 'Campaign dispatched';
        case 'contact.import': return 'Bulk contacts imported';
        case 'workspace_updated': return 'Workspace settings changed';
        default: return action.replace(/[._]/g, ' ');
    }
}

function getActionIcon(action: string) {
    if (action.startsWith('auth.')) return <Key className="h-5 w-5 text-blue-500" />;
    if (action.startsWith('team.')) return <Users className="h-5 w-5 text-purple-500" />;
    if (action.startsWith('franchise.')) return <Store className="h-5 w-5 text-amber-500" />;
    if (action.startsWith('campaign.')) return <Mail className="h-5 w-5 text-green-500" />;
    if (action.startsWith('contact.')) return <Users className="h-5 w-5 text-teal-500" />;
    return <Shield className="h-5 w-5 text-gray-500" />;
}

function getActionBadgeVariant(action: string): 'success' | 'warning' | 'danger' | 'accent' | 'outline' {
    if (action.includes('delete') || action.includes('remove') || action.includes('suspended')) return 'danger';
    if (action.includes('update') || action.includes('change')) return 'warning';
    if (action.includes('created') || action.includes('accepted')) return 'success';
    if (action.startsWith('auth.')) return 'accent';
    return 'outline';
}

export default function AuditHistoryPage() {
    const { token, user } = useAuth();
    const { error } = useToast();

    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<AuditFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (token) fetchAuditHistory(filter);
    }, [token, filter]);

    const fetchAuditHistory = async (nextFilter: AuditFilter) => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (nextFilter !== 'all') params.set('action_prefix', nextFilter);
            const res = await fetch(`${API_BASE}/settings/audit?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to load audit history.');
            }
            const data = await res.json();
            setEntries(data.data || []);
        } catch (fetchError: any) {
            console.error(fetchError);
            error(fetchError.message || 'Could not load audit history.');
        } finally {
            setLoading(false);
        }
    };

    const groupedEntries = useMemo(() => {
        const filtered = entries.filter(e => 
            e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.actor?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.actor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groups: Record<string, AuditEntry[]> = {
            Today: [],
            Yesterday: [],
            'Older Activity': []
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        filtered.forEach(entry => {
            const date = new Date(entry.created_at);
            if (date.toDateString() === today.toDateString()) {
                groups['Today'].push(entry);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Yesterday'].push(entry);
            } else {
                groups['Older Activity'].push(entry);
            }
        });

        return Object.entries(groups).filter(([_, items]) => items.length > 0);
    }, [entries, searchTerm]);

    const handleExportAudit = () => {
        const header = ['Timestamp', 'Action', 'Actor', 'Resource Type', 'Resource ID'];
        const rows = entries.map((entry) => [
            entry.created_at,
            entry.action,
            entry.actor?.full_name || entry.actor?.email || 'Unknown actor',
            entry.resource_type || '',
            entry.resource_id || '',
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'workspace_audit_history.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-10 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Audit History</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Traceable, append-only history of critical workspace events and governance actions.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Button 
                        onClick={handleExportAudit} 
                        disabled={!entries.length}
                        className="h-11 px-6 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 bg-[var(--accent)] text-white hover:opacity-90 border-0 flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export Audit Trail
                    </Button>
                </div>
            </div>

            {/* 🟢 RETENTION BANNER */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--info)]/20 bg-gradient-to-r from-[var(--info)]/10 to-transparent p-6 shadow-sm">
                <div className="flex items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--info)]/20 rounded-2xl text-[var(--info)]">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Log Retention Period</h2>
                            <p className="text-sm font-medium text-[var(--text-primary)] opacity-70 leading-relaxed">
                                Your current plan retains audit logs for **30 days**. Upgrade to Enterprise for unlimited history and cold-storage archival.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="hidden md:flex rounded-xl font-bold bg-white/50 backdrop-blur-sm border-[var(--info)]/30 text-[var(--info)]">
                        Increase Retention
                    </Button>
                </div>
            </div>

            {/* 🟢 SEARCH & FILTERS */}
            <div className="flex flex-col lg:flex-row items-center gap-4 py-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <input 
                        type="text"
                        placeholder="Search by user, action, or email..."
                        className="w-full pl-12 pr-4 h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--accent)]/10 focus:border-[var(--accent)] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === f.value ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 🟢 AUDIT FEED - TIMELINE GROUPING */}
            <div className="space-y-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
                        <p className="text-sm font-bold text-[var(--text-muted)] tracking-tight">Syncing audit trail...</p>
                    </div>
                ) : groupedEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/30 text-center animate-in fade-in">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm mb-6">
                            <History className="h-10 w-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No results found</h3>
                        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                            We couldn't find any audit events matching your current search or filter criteria.
                        </p>
                    </div>
                ) : (
                    groupedEntries.map(([title, items]) => (
                        <div key={title} className="space-y-4">
                            <div className="flex items-center gap-4 px-2">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{title}</h3>
                                <div className="h-[1px] flex-1 bg-[var(--border)]/50" />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {items.map((entry) => (
                                    <div key={entry.id} className="group relative flex flex-col lg:flex-row lg:items-center gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:shadow-md hover:border-[var(--border)]/80 hover:-translate-y-0.5">
                                        <div className="flex items-center gap-4 lg:w-1/3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-inner transition-transform group-hover:scale-110">
                                                {getActionIcon(entry.action)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate tracking-tight">
                                                    {summarizeAction(entry.action)}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Badge variant={getActionBadgeVariant(entry.action)} className="px-1.5 py-0 text-[10px] font-black uppercase">
                                                        {entry.action.split('.')[0]}
                                                    </Badge>
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] truncate">{entry.action}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col gap-1 pl-16 lg:pl-0">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center text-[10px] font-black text-[var(--accent)] border border-[var(--accent)]/10">
                                                    {(entry.actor?.full_name || entry.actor?.email || '?')[0].toUpperCase()}
                                                </div>
                                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                                    {entry.actor?.full_name || entry.actor?.email || 'System Action'}
                                                </p>
                                            </div>
                                            {entry.resource_type && (
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--text-muted)]">
                                                    <span className="opacity-60 italic">Resource:</span>
                                                    <span className="font-bold text-[var(--text-primary)]/80">{entry.resource_type}</span>
                                                    {entry.resource_id && (
                                                        <>
                                                            <ChevronRight className="h-2 w-2 opacity-40" />
                                                            <span className="font-mono text-[var(--accent)]">{entry.resource_id.substring(0, 8)}...</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="lg:text-right pl-16 lg:pl-0">
                                            <div className="flex lg:flex-col items-center lg:items-end gap-2 lg:gap-0">
                                                <p className="text-[11px] font-black text-[var(--text-primary)]">
                                                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                                    {new Date(entry.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🟢 BOTTOM INFO */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                <Shield className="h-3 w-3" />
                Immutable & Traceable Workspace Feed
            </div>
        </div>
    );
}
