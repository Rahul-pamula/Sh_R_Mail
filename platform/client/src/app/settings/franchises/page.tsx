'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, Store, Trash2, UserPlus, Network, LayoutGrid, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/utils/permissions';
import { useRouter } from 'next/navigation';
import { Badge, Button, ConfirmModal, InlineAlert, Input, ModalShell, PageHeader, SectionCard, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface FranchiseOwner {
    user_id: string;
    email?: string | null;
    full_name?: string | null;
}

interface PendingInvite {
    id: string;
    email: string;
    expires_at: string;
}

interface Franchise {
    id: string;
    workspace_name: string;
    status: 'pending_invite' | 'active' | 'suspended' | 'deleted';
    created_at: string;
    owner?: FranchiseOwner | null;
    pending_invite?: PendingInvite | null;
}

export default function FranchiseSettingsPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const { success, error } = useToast();

    useEffect(() => {
        if (user && !can(user, 'franchise:manage')) {
            router.replace('/dashboard');
        }
    }, [user, router]);

    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [domains, setDomains] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [selectedDomainId, setSelectedDomainId] = useState('');
    const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [pendingSuspend, setPendingSuspend] = useState<Franchise | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Franchise | null>(null);
    const [actionBusy, setActionBusy] = useState(false);

    useEffect(() => {
        if (token) {
            fetchFranchises();
            fetchDomains();
            fetchRequests();
        }
    }, [token]);

    const fetchRequests = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/team/franchise-requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setIncomingRequests(await res.json());
        } catch (err) { console.error('Failed to fetch requests', err); }
    };

    const fetchFranchises = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/team/franchises`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to load franchises.');
            }
            setFranchises(await res.json());
        } catch (fetchError: any) {
            console.error(fetchError);
            error(fetchError.message || 'Could not load franchise accounts.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRequest = async (requestId: string) => {
        setActionBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/franchise-requests/${requestId}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                success('Franchise created from request.');
                fetchRequests();
                fetchFranchises();
            } else {
                const d = await res.json();
                error(d.detail || 'Approval failed');
            }
        } catch { error('Network error'); } finally { setActionBusy(false); }
    };

    const handleRejectRequest = async (requestId: string) => {
        setActionBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/franchise-requests/${requestId}/reject`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                success('Request rejected.');
                fetchRequests();
            } else {
                const d = await res.json();
                error(d.detail || 'Rejection failed');
            }
        } catch { error('Network error'); } finally { setActionBusy(false); }
    };

    const fetchDomains = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/domains/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const response = await res.json();
                const data = response.data || [];
                const verified = data.filter((d: any) => d.status === 'verified');
                setDomains(verified);
                if (verified.length > 0 && !selectedDomainId) {
                    setSelectedDomainId(verified[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch domains', err);
        }
    };

    const resetCreateForm = () => {
        setWorkspaceName('');
        setOwnerEmail('');
        setCreateStatus('idle');
    };

    const handleCreateFranchise = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDomainId) {
            error('You must select a verified domain for the franchise.');
            return;
        }
        setCreateStatus('saving');
        try {
            const res = await fetch(`${API_BASE}/team/franchises`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    workspace_name: workspaceName, 
                    email: ownerEmail,
                    domain_id: selectedDomainId 
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to create franchise.');
            }
            setCreateStatus('success');
            success(`Franchise ${workspaceName} created.`);
            setTimeout(() => {
                setShowCreateModal(false);
                resetCreateForm();
                fetchFranchises();
            }, 700);
        } catch (createError: any) {
            console.error(createError);
            setCreateStatus('error');
            error(createError.message || 'Could not create franchise.');
        }
    };

    const handleSuspendOrReactivate = async () => {
        if (!pendingSuspend) return;
        setActionBusy(true);
        try {
            const endpoint = pendingSuspend.status === 'suspended' ? 'reactivate' : 'suspend';
            const res = await fetch(`${API_BASE}/team/franchises/${pendingSuspend.id}/${endpoint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to update franchise.');
            }
            success(`Franchise ${pendingSuspend.status === 'suspended' ? 'reactivated' : 'suspended'}.`);
            setPendingSuspend(null);
            fetchFranchises();
        } catch (actionError: any) {
            console.error(actionError);
            error(actionError.message || 'Could not update franchise status.');
        } finally {
            setActionBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        setActionBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/franchises/${pendingDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to delete franchise.');
            }
            success(`Franchise ${pendingDelete.workspace_name} deleted.`);
            setPendingDelete(null);
            fetchFranchises();
        } catch (deleteError: any) {
            console.error(deleteError);
            error(deleteError.message || 'Could not delete franchise.');
        } finally {
            setActionBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"></div>
            </div>
        );
    }

    if (!user || !can(user, 'franchise:manage')) {
        return null;
    }

    return (
        <div className="space-y-10 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Workspace Network</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Govern child workspaces while maintaining strict isolation of campaigns, contacts, and member access.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Button 
                        onClick={() => setShowCreateModal(true)} 
                        className="h-11 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white hover:opacity-90 border-0"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Franchise
                    </Button>
                </div>
            </div>

            {/* 🟢 TOP METRICS - COLORED INSIGHT CARDS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Total Franchises */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--info)]/30 bg-gradient-to-br from-[var(--info)]/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-[var(--info)]">
                        <Store className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Total Franchises</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">{franchises.length}</span>
                </div>

                {/* Active Accounts */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--success)]/30 bg-gradient-to-br from-[var(--success)]/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-[var(--success)]">
                        <CheckCircle2 className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Workspaces</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {franchises.filter((item) => item.status === 'active').length}
                    </span>
                </div>

                {/* Incoming Requests */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--warning)]/30 bg-gradient-to-br from-[var(--warning)]/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-[var(--warning)]">
                        <UserPlus className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Incoming Requests</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">{incomingRequests.length}</span>
                </div>
            </div>

            {/* 🚨 WARNING BANNER HERO */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--warning)]/30 bg-gradient-to-r from-[var(--warning)]/10 to-[var(--warning)]/5 p-6 shadow-sm">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--warning)]" />
                <div className="flex items-start md:items-center gap-4">
                    <div className="flex-shrink-0 p-3 bg-[var(--warning)]/20 rounded-2xl text-[var(--warning)]">
                        <Network className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Franchise workspaces are strictly isolated</h2>
                        <p className="text-sm font-medium text-[var(--text-primary)] opacity-80 max-w-4xl leading-relaxed">
                            Each franchise operates completely independently. Suspending or deleting a child workspace instantly affects its internal members and operations, but has absolutely no impact on this parent workspace.
                        </p>
                    </div>
                </div>
            </div>

            {incomingRequests.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Incoming Requests</h2>
                            <p className="text-sm text-[var(--text-muted)]">Other users have requested to join your organization as a franchise.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {incomingRequests.map((req) => (
                            <div key={req.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 shadow-sm">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]">
                                            <UserPlus className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{req.users?.email}</p>
                                                <Badge variant="warning">Pending Review</Badge>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Requesting access to: <span className="font-semibold text-[var(--text-primary)]">{req.domains?.domain_name}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pl-14 lg:pl-0 mt-2 lg:mt-0">
                                    <Button 
                                        size="sm" 
                                        className="rounded-xl font-bold px-6"
                                        onClick={() => handleApproveRequest(req.id)}
                                        isLoading={actionBusy}
                                    >
                                        Approve
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        className="rounded-xl font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 border-0"
                                        onClick={() => handleRejectRequest(req.id)}
                                        disabled={actionBusy}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🟢 WORKSPACE LIST REDESIGN */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Child Workspaces</h2>
                        <p className="text-sm text-[var(--text-muted)]">Manage lifecycle state for your franchise network.</p>
                    </div>
                    <Badge variant="outline" className="px-3 py-1 text-sm font-bold">{franchises.length} Total</Badge>
                </div>

                {franchises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/30 text-center animate-in fade-in">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm mb-6">
                            <LayoutGrid className="h-10 w-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Franchise Workspaces Yet</h3>
                        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-8 leading-relaxed">
                            Franchise workspaces allow you to spin up completely isolated environments for different teams, brands, or clients while keeping data secure and separated.
                        </p>
                        <Button 
                            onClick={() => setShowCreateModal(true)} 
                            className="h-11 px-6 rounded-xl shadow-md bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white hover:opacity-90 border-0"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Franchise
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {franchises.map((franchise) => (
                            <div key={franchise.id} className="group flex flex-col p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--border)]/80">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] shadow-inner text-xl font-extrabold text-[var(--text-primary)]">
                                            {franchise.workspace_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{franchise.workspace_name}</p>
                                            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Created {new Date(franchise.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Badge variant={franchise.status === 'suspended' ? 'warning' : franchise.status === 'pending_invite' ? 'outline' : 'success'}>
                                        {franchise.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                
                                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border)] mb-6 flex-1">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Franchise Owner</p>
                                    {franchise.owner?.email ? (
                                        <p className="text-sm font-bold text-[var(--text-primary)]">{franchise.owner.full_name || franchise.owner.email}</p>
                                    ) : franchise.pending_invite ? (
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{franchise.pending_invite.email}</p>
                                            <p className="text-[11px] text-[var(--warning)] font-semibold mt-0.5">Invite Pending Acceptance</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm italic text-[var(--text-muted)]">Owner not assigned yet.</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]/60">
                                    <Button
                                        variant="secondary"
                                        className={`rounded-xl font-bold ${franchise.status === 'suspended' ? 'text-[var(--success)] hover:bg-[var(--success)]/10 hover:border-[var(--success)]/30' : 'text-[var(--warning)] hover:bg-[var(--warning)]/10 hover:border-[var(--warning)]/30'}`}
                                        onClick={() => setPendingSuspend(franchise)}
                                    >
                                        {franchise.status === 'suspended' ? <PlayCircle className="h-4 w-4 mr-2" /> : <PauseCircle className="h-4 w-4 mr-2" />}
                                        {franchise.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="rounded-xl font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                                        onClick={() => setPendingDelete(franchise)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ModalShell
                isOpen={showCreateModal}
                onClose={() => {
                    if (createStatus === 'saving') return;
                    setShowCreateModal(false);
                    resetCreateForm();
                }}
                title="Add Franchise Workspace"
                description="This creates a child workspace and sends an owner invitation to the franchise lead."
                maxWidthClass="max-w-xl"
            >
                <form onSubmit={handleCreateFranchise} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[var(--text-primary)]">Franchise Workspace Name <span className="text-[var(--danger)]">*</span></label>
                        <input
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            placeholder="ShrFlow Dallas"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                            required
                            autoFocus
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[var(--text-primary)]">Franchise Owner Email <span className="text-[var(--danger)]">*</span></label>
                        <input
                            type="email"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            placeholder="owner@franchise.com"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[var(--text-primary)]">
                            Allocate Sending Domain <span className="text-[var(--danger)]">*</span>
                        </label>
                        <select
                            value={selectedDomainId}
                            onChange={(e) => setSelectedDomainId(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                            required
                        >
                            {domains.length === 0 ? (
                                <option value="" disabled>No verified domains available</option>
                            ) : (
                                domains.map(d => (
                                    <option key={d.id} value={d.id}>{d.domain_name}</option>
                                ))
                            )}
                        </select>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1">
                            Select a verified domain from your workspace to allocate to this franchise.
                        </p>
                    </div>

                    {createStatus === 'error' && (
                        <InlineAlert
                            variant="danger"
                            title="Could not create franchise"
                            description="Check whether an active invite already exists or the workspace name is incomplete."
                            icon={<AlertTriangle className="mt-0.5 h-4 w-4" />}
                        />
                    )}

                    {createStatus === 'success' && (
                        <InlineAlert
                            variant="success"
                            title="Franchise created"
                            description="The child workspace is ready and the owner invitation has been sent."
                            icon={<CheckCircle2 className="mt-0.5 h-4 w-4" />}
                        />
                    )}

                    <div className="flex items-center gap-3 pt-6 border-t border-[var(--border)]/60">
                        <Button type="submit" className="h-11 px-8 rounded-xl font-bold flex-1" isLoading={createStatus === 'saving'} disabled={createStatus === 'success'}>
                            Create Franchise
                        </Button>
                        <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl font-bold flex-1" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} disabled={createStatus === 'saving'}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </ModalShell>

            <ConfirmModal
                isOpen={Boolean(pendingSuspend)}
                onClose={() => setPendingSuspend(null)}
                onConfirm={handleSuspendOrReactivate}
                title={pendingSuspend?.status === 'suspended' ? 'Reactivate franchise?' : 'Suspend franchise?'}
                message={
                    pendingSuspend?.status === 'suspended'
                        ? `This will restore access to ${pendingSuspend?.workspace_name}. Their operations will resume.`
                        : `This will instantly pause access and operations for ${pendingSuspend?.workspace_name} until it is reactivated.`
                }
                confirmLabel={pendingSuspend?.status === 'suspended' ? 'Reactivate Franchise' : 'Suspend Franchise'}
                isLoading={actionBusy && Boolean(pendingSuspend)}
                variant={pendingSuspend?.status === 'suspended' ? 'primary' : 'warning'}
            />

            <ConfirmModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
                title="Delete franchise?"
                message={pendingDelete ? `Deleting ${pendingDelete.workspace_name} will permanently destroy the child workspace and all its related access records. This cannot be undone.` : 'Delete this franchise.'}
                confirmLabel="Delete Franchise"
                isLoading={actionBusy && Boolean(pendingDelete)}
                variant="danger"
            />
        </div>
    );
}
