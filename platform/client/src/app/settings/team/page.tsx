'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, Shield, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, ConfirmModal, InlineAlert, Input, KeyValueList, ModalShell, PageHeader, SectionCard, StatCard, TableToolbar, useToast } from '@/components/ui';

const API_BASE = 'http://127.0.0.1:8000';

type Role = 'owner' | 'admin' | 'member';
type IsolationModel = 'team' | 'agency';

interface Member {
    user_id: string;
    email: string;
    full_name: string | null;
    role: Role;
    isolation_model?: IsolationModel;
    joined_at: string;
}

interface Invite {
    id: string;
    email: string;
    role: Role;
    expires_at: string;
    created_at: string;
    inviter_id?: string;
}

const selectClassName = 'rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';

function RoleBadge({ role, isCurrentUser = false }: { role: Role; isCurrentUser?: boolean }) {
    const variant = role === 'owner' ? 'warning' : role === 'admin' ? 'info' : 'outline';
    return <Badge variant={variant}>{role}{isCurrentUser ? ' (You)' : ''}</Badge>;
}

export default function TeamSettingsPage() {
    const { token, user } = useAuth();
    const { success, error } = useToast();

    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [inviteIsolation, setInviteIsolation] = useState<IsolationModel>('team');
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [pendingRemoveMember, setPendingRemoveMember] = useState<Member | null>(null);
    const [pendingCancelInvite, setPendingCancelInvite] = useState<Invite | null>(null);
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);

    const membersAbortRef = useRef<AbortController | null>(null);
    const invitesAbortRef = useRef<AbortController | null>(null);

    const myRole = members.find((member) => member.user_id === user?.userId)?.role || 'member';
    const isAdminOrOwner = myRole === 'admin' || myRole === 'owner';

    const metrics = useMemo(() => ([
        { label: 'Active Members', value: members.length.toString() },
        { label: 'Pending Invites', value: invites.length.toString() },
        { label: 'Owners / Admins', value: members.filter((member) => member.role !== 'member').length.toString() },
        { label: 'Agency-Isolated', value: members.filter((member) => member.isolation_model === 'agency').length.toString() },
    ]), [members, invites]);

    useEffect(() => {
        fetchTeam();
        return () => {
            membersAbortRef.current?.abort();
            invitesAbortRef.current?.abort();
        };
    }, [token]);

    const fetchTeam = async () => {
        if (!token) return;
        setLoading(true);
        try {
            membersAbortRef.current?.abort();
            invitesAbortRef.current?.abort();

            const memberController = new AbortController();
            const inviteController = new AbortController();
            membersAbortRef.current = memberController;
            invitesAbortRef.current = inviteController;

            const [memberResponse, inviteResponse] = await Promise.all([
                fetch(`${API_BASE}/team/members`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: memberController.signal,
                }),
                fetch(`${API_BASE}/team/invites`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: inviteController.signal,
                }),
            ]);

            if (memberResponse.ok) setMembers(await memberResponse.json());
            if (inviteResponse.ok) setInvites(await inviteResponse.json());
        } catch (fetchError: any) {
            if (fetchError.name !== 'AbortError') {
                console.error(fetchError);
                error('Failed to load team settings.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetInviteForm = () => {
        setInviteEmail('');
        setInviteRole('member');
        setInviteIsolation('team');
        setInviteStatus('idle');
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !inviteEmail.trim()) return;

        setInviteStatus('sending');
        try {
            const res = await fetch(`${API_BASE}/team/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                    isolation_model: inviteIsolation,
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            setInviteStatus('success');
            success(`Invitation sent to ${inviteEmail}.`);
            setTimeout(() => {
                setShowInviteModal(false);
                resetInviteForm();
                fetchTeam();
            }, 900);
        } catch (inviteError) {
            console.error(inviteError);
            setInviteStatus('error');
        }
    };

    const handleRemoveMember = async () => {
        if (!pendingRemoveMember) return;
        setConfirmBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/members/${pendingRemoveMember.user_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to remove member.');
            success(`Removed ${pendingRemoveMember.email} from the workspace.`);
            setPendingRemoveMember(null);
            fetchTeam();
        } catch (removeError) {
            console.error(removeError);
            error('Could not remove that member.');
        } finally {
            setConfirmBusy(false);
        }
    };

    const handleLeaveWorkspace = async () => {
        setConfirmBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/members/me/leave`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            throw new Error(data.detail || 'Failed to leave workspace.');
        } catch (leaveError: any) {
            console.error(leaveError);
            error(leaveError.message || 'An error occurred while leaving the workspace.');
        } finally {
            setConfirmBusy(false);
            setConfirmLeaveOpen(false);
        }
    };

    const handleCancelInvite = async () => {
        if (!pendingCancelInvite) return;
        setConfirmBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/invites/${pendingCancelInvite.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to cancel invitation.');
            success(`Canceled invitation for ${pendingCancelInvite.email}.`);
            setPendingCancelInvite(null);
            fetchTeam();
        } catch (cancelError) {
            console.error(cancelError);
            error('Could not cancel that invitation.');
        } finally {
            setConfirmBusy(false);
        }
    };

    const handleChangeMember = async (userId: string, field: 'role' | 'isolation_model', value: string) => {
        try {
            const res = await fetch(`${API_BASE}/team/members/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Update failed.');
            }
            success('Member permissions updated.');
            fetchTeam();
        } catch (updateError: any) {
            error(updateError.message || 'Failed to update member.');
        }
    };

    const pendingInviteError = inviteStatus === 'error';

    if (loading) {
        return <div className="p-12 text-sm text-[var(--text-muted)]">Loading team settings...</div>;
    }

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Team Members"
                subtitle="Manage workspace access, roles, and data isolation so campaign work and infrastructure control stay appropriately separated."
                action={isAdminOrOwner ? <Button onClick={() => setShowInviteModal(true)}><UserPlus className="h-4 w-4" />Invite Member</Button> : null}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <StatCard key={metric.label} label={metric.label} value={metric.value} icon={<Users className="h-5 w-5" />} />
                ))}
            </div>

            {!isAdminOrOwner && (
                <InlineAlert
                    variant="info"
                    title="Workspace management is limited"
                    description="Only owners and admins can invite members, remove users, or change workspace-level permissions."
                />
            )}

            <SectionCard title="Active Members" description="Use roles for administrative scope and isolation modes for data visibility boundaries.">
                <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]">
                    <TableToolbar
                        title="Workspace Access"
                        description="The person with owner access can control both role changes and isolation modes."
                        trailing={<Badge variant="outline">{members.length} active</Badge>}
                        className="rounded-none border-0 border-b border-[var(--border)]"
                    />
                    <div className="divide-y divide-[var(--border)]">
                        {members.map((member) => {
                            const isCurrentUser = member.user_id === user?.userId;
                            const canEditMember = myRole === 'owner' && !isCurrentUser;
                            return (
                                <div key={member.user_id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]">
                                            {(member.full_name || member.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{member.full_name || 'No name provided'}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 lg:items-end">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {canEditMember && member.role !== 'owner' ? (
                                                <select
                                                    value={member.isolation_model || 'team'}
                                                    onChange={(e) => handleChangeMember(member.user_id, 'isolation_model', e.target.value)}
                                                    className={selectClassName}
                                                >
                                                    <option value="team">Team Mode</option>
                                                    <option value="agency">Agency Mode</option>
                                                </select>
                                            ) : (
                                                <Badge variant="outline">{member.role === 'owner' ? 'All Access' : `${member.isolation_model || 'team'} mode`}</Badge>
                                            )}

                                            {canEditMember ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleChangeMember(member.user_id, 'role', e.target.value)}
                                                    className={selectClassName}
                                                >
                                                    <option value="owner">Owner</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="member">Member</option>
                                                </select>
                                            ) : (
                                                <RoleBadge role={member.role} isCurrentUser={isCurrentUser} />
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-[var(--text-muted)]">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                                            {isCurrentUser && member.role !== 'owner' && (
                                                <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]" onClick={() => setConfirmLeaveOpen(true)}>
                                                    <Shield className="h-3.5 w-3.5" />
                                                    Leave
                                                </Button>
                                            )}
                                            {isAdminOrOwner && member.role !== 'owner' && !isCurrentUser && (
                                                <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]" onClick={() => setPendingRemoveMember(member)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SectionCard>

            {invites.length > 0 && (
                <SectionCard title="Pending Invites" description="Keep an eye on expiring invitations so access doesn’t stall during onboarding.">
                    <div className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]">
                        {invites.map((invite) => {
                            const isExpired = new Date(invite.expires_at) < new Date();
                            return (
                                <div key={invite.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)]">
                                            <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{invite.email}</p>
                                            <p className="text-sm text-[var(--text-muted)]">Invited as {invite.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isExpired ? (
                                            <Badge variant="danger">Expired</Badge>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
                                        )}
                                        {(isAdminOrOwner || invite.inviter_id === user?.userId) && (
                                            <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]" onClick={() => setPendingCancelInvite(invite)}>
                                                <X className="h-3.5 w-3.5" />
                                                Cancel Invite
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            <SectionCard title="Roles & Isolation Permissions" description="This matrix keeps administrative control and data-visibility boundaries explicit across the workspace.">
                <KeyValueList
                    columns={2}
                    items={[
                        { label: 'Owner', value: 'Full access', helper: 'Can manage roles, isolation modes, domains, and billing.' },
                        { label: 'Admin', value: 'Operational admin', helper: 'Can manage domains, invites, and shared workspace operations.' },
                        { label: 'Team Member', value: 'Shared workspace contributor', helper: 'Can create campaigns and import contacts against shared data.' },
                        { label: 'Agency Member', value: 'Isolated contributor', helper: 'Can work in the workspace while seeing only their own data.' },
                    ]}
                />
                <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-muted)]">
                    Owners and admins can manage sending domains and members. Isolation mode only changes what data a member can view, not whether they can create campaigns.
                </div>
            </SectionCard>

            <ModalShell
                isOpen={showInviteModal}
                onClose={() => {
                    if (inviteStatus === 'sending') return;
                    setShowInviteModal(false);
                    resetInviteForm();
                }}
                title="Invite Team Member"
                description="An invitation link will be sent to their email. Choose both the workspace role and data visibility model before sending."
                maxWidthClass="max-w-2xl"
            >
                <form onSubmit={handleSendInvite} className="space-y-6">
                    <Input
                        label="Email Address"
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        autoFocus
                    />

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <SectionCard title="Workspace Role" description="Controls administrative permissions inside the workspace." noPadding className="border-0 bg-transparent">
                            <div className="grid gap-3">
                                {(['member', 'admin'] as const).map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setInviteRole(role)}
                                        className={`rounded-[var(--radius)] border p-4 text-left transition ${inviteRole === role ? 'border-[var(--accent)] bg-[var(--info-bg)]/40' : 'border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]'}`}
                                    >
                                        <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{role}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{role === 'admin' ? 'Manage billing, domains, and member access.' : 'Build campaigns and work with audience data.'}</p>
                                    </button>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Access Mode" description="Controls whether they see shared or isolated workspace data." noPadding className="border-0 bg-transparent">
                            <div className="grid gap-3">
                                {([
                                    { value: 'team', label: 'Team Mode', description: 'Shares workspace campaigns, contacts, and history.' },
                                    { value: 'agency', label: 'Agency Mode', description: 'Shows only the member’s own data and activity.' },
                                ] as const).map((mode) => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        onClick={() => setInviteIsolation(mode.value)}
                                        className={`rounded-[var(--radius)] border p-4 text-left transition ${inviteIsolation === mode.value ? 'border-[var(--accent)] bg-[var(--info-bg)]/40' : 'border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]'}`}
                                    >
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{mode.label}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{mode.description}</p>
                                    </button>
                                ))}
                            </div>
                        </SectionCard>
                    </div>

                    {pendingInviteError && (
                        <InlineAlert
                            variant="danger"
                            title="Failed to send invite"
                            description="The user may already exist in an isolated state or the invitation could not be created."
                            icon={<AlertTriangle className="mt-0.5 h-4 w-4" />}
                        />
                    )}

                    {inviteStatus === 'success' && (
                        <InlineAlert
                            variant="success"
                            title="Invite sent"
                            description="The invitation email has been issued successfully."
                            icon={<CheckCircle2 className="mt-0.5 h-4 w-4" />}
                        />
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => { setShowInviteModal(false); resetInviteForm(); }} disabled={inviteStatus === 'sending'}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={inviteStatus === 'sending'} disabled={inviteStatus === 'success'}>
                            Send Invitation Link
                        </Button>
                    </div>
                </form>
            </ModalShell>

            <ConfirmModal
                isOpen={Boolean(pendingRemoveMember)}
                onClose={() => setPendingRemoveMember(null)}
                onConfirm={handleRemoveMember}
                title="Remove team member?"
                message={pendingRemoveMember ? `${pendingRemoveMember.email} will lose access to campaigns, contacts, and workspace history.` : 'Remove this member.'}
                confirmLabel="Remove Member"
                isLoading={confirmBusy && Boolean(pendingRemoveMember)}
            />

            <ConfirmModal
                isOpen={Boolean(pendingCancelInvite)}
                onClose={() => setPendingCancelInvite(null)}
                onConfirm={handleCancelInvite}
                title="Cancel invitation?"
                message={pendingCancelInvite ? `This will invalidate the invite sent to ${pendingCancelInvite.email}.` : 'Cancel this invitation.'}
                confirmLabel="Cancel Invitation"
                isLoading={confirmBusy && Boolean(pendingCancelInvite)}
                variant="warning"
            />

            <ConfirmModal
                isOpen={confirmLeaveOpen}
                onClose={() => setConfirmLeaveOpen(false)}
                onConfirm={handleLeaveWorkspace}
                title="Leave workspace?"
                message="You will lose access to campaigns, contacts, and workspace configuration. Verified domains or sender identities tied to this workspace may no longer be usable for you."
                confirmLabel="Leave Workspace"
                isLoading={confirmBusy && confirmLeaveOpen}
            >
                <div className="rounded-[var(--radius)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--text-primary)]">
                    You will need a fresh invitation to regain access later.
                </div>
            </ConfirmModal>
        </div>
    );
}
