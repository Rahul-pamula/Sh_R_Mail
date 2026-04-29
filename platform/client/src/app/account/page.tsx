'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, CheckCircle2, Clock3, Inbox, MailPlus, Plus, Shield, Sparkles, UserCircle2, X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button, EmptyState, InlineAlert, Input, ModalShell, PageHeader, SectionCard, StatCard } from '@/components/ui';
import { AccountWorkspace, fetchAccountWorkspaces } from '@/lib/account';

interface Invitation {
    id: string;
    tenant_id: string;
    role: string;
    workspace_name: string;
    workspace_status: string;
    inviter_name?: string;
    token: string;
    expires_at: string;
}

export default function AccountPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, user, handleAuthSuccess, switchWorkspace } = useAuth();
    const [workspaces, setWorkspaces] = useState<AccountWorkspace[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [createError, setCreateError] = useState('');
    const [createName, setCreateName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [busyWorkspaceId, setBusyWorkspaceId] = useState<string | null>(null);
    const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
    const [decliningInviteId, setDecliningInviteId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const createInputRef = useRef<HTMLInputElement | null>(null);
    const createSectionRef = useRef<HTMLDivElement | null>(null);
    const shouldOpenCreateFlow = searchParams.get('create') === 'true';

    const onboardingCount = workspaces.filter((workspace) => workspace.status === 'onboarding').length;

    useEffect(() => {
        if (!token) return;
        loadAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (!shouldOpenCreateFlow) return;

        setIsCreateModalOpen(true);
        createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const timeout = window.setTimeout(() => {
            createInputRef.current?.focus();
        }, 150);

        return () => window.clearTimeout(timeout);
    }, [shouldOpenCreateFlow]);

    const loadAccountData = async () => {
        const authToken = token || localStorage.getItem('auth_token');
        if (!authToken) return;

        setLoading(true);
        setPageError('');

        try {
            const [workspaceData, invitationRes] = await Promise.all([
                fetchAccountWorkspaces(authToken),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/account/invitations`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                }),
            ]);

            const invitationData = invitationRes.ok ? await invitationRes.json() : [];

            setWorkspaces(Array.isArray(workspaceData) ? workspaceData : []);
            setInvitations(Array.isArray(invitationData) ? invitationData : []);
        } catch (loadError: any) {
            console.error(loadError);
            setPageError(loadError.message || 'Failed to load account details.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorkspace = async () => {
        const authToken = token || localStorage.getItem('auth_token');
        if (!authToken || !createName.trim()) return;

        setIsCreating(true);
        setCreateError('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/workspaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ company_name: createName.trim() }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create workspace.');
            }

            handleAuthSuccess(data);
            setCreateName('');
            setIsCreateModalOpen(false);
            router.push('/onboarding/workspace');
        } catch (createError: any) {
            console.error(createError);
            setCreateError(createError.message || 'Failed to create workspace.');
        } finally {
            setIsCreating(false);
        }
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        if (shouldOpenCreateFlow) {
            router.replace('/account');
        }
    };

    const handleJoinInvitation = async (invitation: Invitation) => {
        const authToken = token || localStorage.getItem('auth_token');
        if (!authToken) return;

        setBusyInviteId(invitation.id);
        setPageError('');

        try {
            const acceptRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/invites/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ token: invitation.token }),
            });

            const acceptData = await acceptRes.json();
            if (!acceptRes.ok) {
                throw new Error(acceptData.detail || 'Failed to accept invitation.');
            }

            if (acceptData.new_token) {
                localStorage.setItem('auth_token', acceptData.new_token);
            }

            await switchWorkspace(invitation.tenant_id);
        } catch (inviteError: any) {
            console.error(inviteError);
            setPageError(inviteError.message || 'Failed to join workspace.');
            setBusyInviteId(null);
            await loadAccountData();
        }
    };

    const handleOpenWorkspace = async (workspace: AccountWorkspace) => {
        if (workspace.tenant_id === user?.tenantId) {
            router.push(workspace.status === 'onboarding' ? '/onboarding/workspace' : '/dashboard');
            return;
        }

        setBusyWorkspaceId(workspace.tenant_id);
        try {
            await switchWorkspace(workspace.tenant_id);
        } catch (workspaceError: any) {
            console.error(workspaceError);
            setPageError(workspaceError.message || 'Failed to switch workspace.');
            setBusyWorkspaceId(null);
        }
    };

    const handleDeclineInvitation = async (invitationId: string) => {
        const authToken = token || localStorage.getItem('auth_token');
        if (!authToken) return;

        setDecliningInviteId(invitationId);
        setPageError('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account/invitations/${invitationId}/decline`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to decline invitation.');
            }

            setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
        } catch (declineError: any) {
            console.error(declineError);
            setPageError(declineError.message || 'Failed to decline invitation.');
        } finally {
            setDecliningInviteId(null);
        }
    };

    const roleLabel = (role: string) => role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const workspaceTypeLabel = (workspaceType: string) => workspaceType === 'FRANCHISE' ? 'Franchise' : 'Main';

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Account Center"
                subtitle="Identity, memberships, invitations, and new workspace creation live here. Campaigns, contacts, billing, and delivery stay inside each workspace."
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href="/account/security">
                            <Button variant="secondary">
                                <Shield className="h-4 w-4" />
                                Account Security
                            </Button>
                        </Link>
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Create Workspace
                        </Button>
                    </div>
                }
            />

            <SectionCard title="Identity" description="This account can move between workspaces, receive invitations, and manage sign-in security without carrying workspace business state with it.">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
                    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                            <UserCircle2 className="h-8 w-8" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Signed In As</p>
                            <p className="mt-1 truncate text-base font-semibold text-[var(--text-primary)]">{user?.email || 'Unknown account'}</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">Workspace roles stay dynamic per membership and are resolved from the backend every time this page loads.</p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                        <StatCard label="Workspaces" value={workspaces.length} icon={<Building2 className="h-5 w-5" />} />
                        <StatCard label="Pending Invites" value={invitations.length} icon={<MailPlus className="h-5 w-5" />} />
                        <StatCard label="Need Onboarding" value={onboardingCount} icon={<Clock3 className="h-5 w-5" />} />
                    </div>
                </div>
            </SectionCard>

            {pageError && (
                <InlineAlert
                    variant="danger"
                    title="Account action failed"
                    description={pageError}
                />
            )}

            <div ref={createSectionRef}>
                <SectionCard
                    title="Create Workspace"
                    description="Spin up a fresh workspace without disturbing your existing tenant structure. Every new workspace starts with its own onboarding path."
                    className={shouldOpenCreateFlow ? 'border-[var(--accent)]/40 shadow-sm shadow-[var(--accent)]/10' : ''}
                    action={
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Create Workspace
                        </Button>
                    }
                >
                    <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr] md:items-end">
                        <Input
                            ref={createInputRef}
                            id="account-create-workspace"
                            label="Workspace name"
                            value={createName}
                            onChange={(event) => setCreateName(event.target.value)}
                            placeholder="Acme Growth"
                        />
                        <p className="text-sm leading-6 text-[var(--text-muted)]">
                            Workspace creation is account-layer only. The new tenant gets its own onboarding path and its own isolated business state.
                        </p>
                    </div>
                </SectionCard>
            </div>

            <ModalShell
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Create Workspace"
                description="Create a new tenant-scoped workspace, then continue through onboarding in that workspace."
                maxWidthClass="max-w-xl"
            >
                <div className="space-y-5">
                    {createError && (
                        <InlineAlert
                            variant="danger"
                            title="Couldn’t create workspace"
                            description={createError}
                        />
                    )}
                    <Input
                        ref={createInputRef}
                        id="account-create-workspace-modal"
                        label="Workspace name"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value)}
                        placeholder="Acme Growth"
                        autoFocus
                    />
                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={closeCreateModal} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateWorkspace} isLoading={isCreating} disabled={!createName.trim()}>
                            <Plus className="h-4 w-4" />
                            Create Workspace
                        </Button>
                    </div>
                </div>
            </ModalShell>

            <SectionCard
                title="Workspaces"
                description="Choose where you want to work. Onboarding status belongs to the workspace you enter, not to your whole identity."
            >
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-[188px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]" />
                        ))}
                    </div>
                ) : workspaces.length === 0 ? (
                    <EmptyState
                        icon={<Building2 className="h-7 w-7" />}
                        title="No workspaces yet"
                        description="Create your first workspace to start onboarding and enter the product."
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {workspaces.map((workspace) => {
                            const isCurrent = workspace.tenant_id === user?.tenantId;
                            const isOnboarding = workspace.status === 'onboarding';

                            return (
                                <article key={workspace.tenant_id} className="flex h-full flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-base font-semibold text-[var(--text-primary)]">{workspace.workspace_name}</p>
                                                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{workspace.plan} plan</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 text-sm text-[var(--text-muted)]">
                                            <div className="flex items-center justify-between gap-3">
                                                <span>Role</span>
                                                <span className="font-medium text-[var(--text-primary)]">{roleLabel(workspace.role || 'viewer')}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span>Status</span>
                                                <span className={`font-medium ${isOnboarding ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                                                    {isOnboarding ? 'Onboarding' : 'Active'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span>Type</span>
                                                <span className="font-medium text-[var(--text-primary)]">{workspaceTypeLabel(workspace.workspace_type)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                            {isOnboarding ? <Clock3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />}
                                            <span>{isOnboarding ? 'Needs onboarding' : 'Ready to enter'}</span>
                                        </div>
                                        <Button
                                            variant={isCurrent ? 'secondary' : 'primary'}
                                            onClick={() => handleOpenWorkspace(workspace)}
                                            isLoading={busyWorkspaceId === workspace.tenant_id}
                                        >
                                            {isCurrent ? (isOnboarding ? 'Resume' : 'Open') : (isOnboarding ? 'Resume' : 'Switch')}
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            <SectionCard
                title="Invitations"
                description="Pending workspace invitations stay outside the workspace layer until you explicitly accept them."
            >
                {loading ? (
                    <div className="h-[120px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]" />
                ) : invitations.length === 0 ? (
                    <EmptyState
                        icon={<Inbox className="h-7 w-7" />}
                        title="No pending invitations"
                        description="Any workspace invites linked to this identity will appear here."
                    />
                ) : (
                    <div className="space-y-3">
                        {invitations.map((invitation) => (
                            <div key={invitation.id} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                        <MailPlus className="h-4 w-4 text-[var(--accent)]" />
                                        <span>{invitation.workspace_name}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Join as {roleLabel(invitation.role || 'viewer')}
                                        {invitation.inviter_name ? ` • invited by ${invitation.inviter_name}` : ''}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Expires {new Date(invitation.expires_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDeclineInvitation(invitation.id)}
                                        isLoading={decliningInviteId === invitation.id}
                                        disabled={busyInviteId === invitation.id}
                                    >
                                        <X className="h-4 w-4" />
                                        Decline
                                    </Button>
                                    <Button
                                        onClick={() => handleJoinInvitation(invitation)}
                                        isLoading={busyInviteId === invitation.id}
                                        disabled={decliningInviteId === invitation.id}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Accept & Join
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
