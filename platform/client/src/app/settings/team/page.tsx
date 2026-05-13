'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowUp, CheckCircle2, Download, Mail, RefreshCcw, Shield, Trash2, UserCog, UserPlus, Users, X, Zap, Crown, Edit3, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/utils/permissions';
import { useRouter } from 'next/navigation';
import { Badge, Button, ConfirmModal, InlineAlert, Input, ModalShell, PageHeader, SectionCard, TableToolbar, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Role = 'OWNER' | 'ADMIN' | 'CREATOR' | 'VIEWER';
type IsolationModel = 'team' | 'agency';

interface Member {
    user_id: string;
    email: string;
    full_name: string | null;
    role: Role;
    joined_at: string;
}

interface Invite {
    id: string;
    email: string;
    role: Role;
    expires_at: string;
    created_at: string;
    inviter_id?: string;
    inviter_name?: string | null;
}

const selectClassName = 'rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';

function RoleBadge({ role, isCurrentUser = false }: { role: Role; isCurrentUser?: boolean }) {
    let colorClass = '';
    let icon = null;
    
    switch (role) {
        case 'OWNER':
            colorClass = 'bg-purple-500/10 text-purple-600 border-purple-500/30';
            icon = <Crown className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'ADMIN':
            colorClass = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
            icon = <Zap className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'CREATOR':
            colorClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
            icon = <Edit3 className="w-3.5 h-3.5 mr-1" />;
            break;
        case 'VIEWER':
            colorClass = 'bg-slate-500/10 text-slate-600 border-slate-500/30';
            icon = <Eye className="w-3.5 h-3.5 mr-1" />;
            break;
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold border ${colorClass}`}>
            {icon}
            {role}{isCurrentUser ? ' (You)' : ''}
        </span>
    );
}

export default function TeamSettingsPage() {
    const { token, user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const { success, error } = useToast();

    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('CREATOR');
    const [inviteIsolation, setInviteIsolation] = useState<IsolationModel>('team');
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [pendingRemoveMember, setPendingRemoveMember] = useState<Member | null>(null);
    const [pendingCancelInvite, setPendingCancelInvite] = useState<Invite | null>(null);
    const [pendingTransferMember, setPendingTransferMember] = useState<Member | null>(null);
    const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: string; email: string } | null>(null);
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
    const [exportBusy, setExportBusy] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportRole, setExportRole] = useState<Role | 'all'>('all');
    const [exportInvitedBy, setExportInvitedBy] = useState<string>('all');
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const membersAbortRef = useRef<AbortController | null>(null);
    const invitesAbortRef = useRef<AbortController | null>(null);

    const myRole = (members.find((member) => member.user_id === user?.userId)?.role?.toUpperCase() as Role) || 'VIEWER';
    const isManagerOrOwner = myRole === 'ADMIN' || myRole === 'OWNER';

    useEffect(() => {
        if (!authLoading) {
            if (user && !can(user, 'team:view')) {
                router.replace('/dashboard');
            } else if (token) {
                fetchTeam();
            }
        }
        return () => {
            membersAbortRef.current?.abort();
            invitesAbortRef.current?.abort();
        };
    }, [authLoading, token, user]);

    if (authLoading || (user && !can(user, 'team:view'))) {
        return null;
    }

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

    const fetchValidation = async () => {
        if (!token) return;
        setIsValidating(true);
        try {
            const res = await fetch(`${API_BASE}/team/invites/limit-check`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setValidationResult(data);
            }
        } catch (err) {
            console.error('Validation fetch failed:', err);
        } finally {
            setIsValidating(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchValidation();
        }
    }, [token]);


    useEffect(() => {
        const savedInvite = localStorage.getItem('pending_team_invite');
        if (savedInvite && typeof window !== 'undefined') {
            try {
                const parsed = JSON.parse(savedInvite);
                const now = Date.now();
                if (parsed.timestamp && now - parsed.timestamp > 30 * 60 * 1000) {
                    localStorage.removeItem('pending_team_invite');
                } else {
                    setInviteEmail(parsed.email || '');
                    setInviteRole(parsed.role || 'CREATOR');
                    setShowInviteModal(true);
                }
            } catch (e) {
                console.error("Failed to parse pending invite", e);
                localStorage.removeItem('pending_team_invite');
            }
        }
    }, []);

    const handleUpgradeClick = () => {
        if (inviteEmail || inviteRole !== 'CREATOR') {
            localStorage.setItem('pending_team_invite', JSON.stringify({ 
                email: inviteEmail, 
                role: inviteRole,
                timestamp: Date.now()
            }));
            localStorage.setItem('upgrade_return_path', '/settings/team');
        }
        router.push('/settings/billing');
    };

    const resetInviteForm = () => {
        setInviteEmail('');
        setInviteRole('CREATOR');
        setInviteStatus('idle');
        setInviteError(null);
        localStorage.removeItem('pending_team_invite');
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !inviteEmail.trim()) return;

        setInviteStatus('sending');
        setInviteError(null);
        try {
            const res = await fetch(`${API_BASE}/team/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const reason = data?.detail || data?.message || `Server error (${res.status})`;
                setInviteError(reason);
                setInviteStatus('error');
                return;
            }

            if (data.status && data.status !== 'OK') {
                const reasonMap: Record<string, string> = {
                    ALREADY_MEMBER: 'This person is already a member of the workspace.',
                    INVITE_ALREADY_SENT: 'An active invitation has already been sent to this email.',
                    LIMIT_EXCEEDED: `Seat limit reached. ${data.message || 'Upgrade your plan to invite more members.'}`,
                    RATE_LIMITED: data.message || 'Too many invites sent. Please wait before trying again.',
                };
                setInviteError(reasonMap[data.status] || data.message || data.status);
                setInviteStatus('error');
                return;
            }

            setInviteStatus('success');
            success(`Invitation sent to ${inviteEmail}.`);
            setTimeout(() => {
                setShowInviteModal(false);
                resetInviteForm();
                fetchTeam();
                fetchValidation();
            }, 900);
        } catch (inviteError) {
            console.error(inviteError);
            setInviteError('Could not reach the server. Please check your connection.');
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
            fetchValidation();
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

    const handleResendInvite = async (invite: Invite) => {
        setResendingInviteId(invite.id);
        try {
            const res = await fetch(`${API_BASE}/team/invites/${invite.id}/resend`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to resend invitation.');
            }
            success(`Invitation resent to ${invite.email}.`);
            fetchTeam();
        } catch (resendError: any) {
            console.error(resendError);
            error(resendError.message || 'Could not resend that invitation.');
        } finally {
            setResendingInviteId(null);
        }
    };

    const handleExportMembers = async (e: React.FormEvent) => {
        e.preventDefault();
        setExportBusy(true);
        try {
            const params = new URLSearchParams();
            if (exportRole !== 'all') params.append('role', exportRole);
            if (exportInvitedBy !== 'all') params.append('invited_by', exportInvitedBy);
            
            const res = await fetch(`${API_BASE}/team/members/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to export members.');
            }

            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || 'workspace_team_members.csv';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setShowExportModal(false);
            success('Team member export downloaded.');
        } catch (exportError: any) {
            console.error(exportError);
            error(exportError.message || 'Could not export workspace members.');
        } finally {
            setExportBusy(false);
        }
    };

    const handleTransferOwnership = async () => {
        if (!pendingTransferMember) return;
        setConfirmBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/members/${pendingTransferMember.user_id}/transfer-ownership`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ new_owner_role_for_current_user: 'ADMIN' }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to transfer ownership.');
            }
            success(`Ownership transferred to ${pendingTransferMember.email}.`);
            setPendingTransferMember(null);
            fetchTeam();
        } catch (transferError: any) {
            console.error(transferError);
            error(transferError.message || 'Could not transfer ownership.');
        } finally {
            setConfirmBusy(false);
        }
    };

    const handleChangeMember = (userId: string, field: 'role', value: string) => {
        const member = members.find(m => m.user_id === userId);
        if (field === 'role' && member) {
            setPendingRoleChange({ userId, role: value, email: member.email });
        }
    };

    const confirmRoleChange = async () => {
        if (!pendingRoleChange) return;
        setConfirmBusy(true);
        try {
            const res = await fetch(`${API_BASE}/team/members/${pendingRoleChange.userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: pendingRoleChange.role }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Update failed.');
            }
            success('Member permissions updated.');
            setPendingRoleChange(null);
            fetchTeam();
        } catch (updateError: any) {
            error(updateError.message || 'Failed to update member.');
        } finally {
            setConfirmBusy(false);
        }
    };

    const pendingInviteError = inviteStatus === 'error';

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Team Management</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Control workspace access, roles, and administrative boundaries.
                    </p>
                </div>
                {isManagerOrOwner && (
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" className="h-11 px-5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5" onClick={() => setShowExportModal(true)}>
                            <Download className="mr-2 h-4 w-4" />
                             Export
                        </Button>
                        {validationResult?.status === 'LIMIT_EXCEEDED' || (validationResult?.limit !== undefined && validationResult.limit !== -1 && validationResult.remaining <= 0) ? (
                            <Button className="h-11 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] hover:opacity-90" onClick={handleUpgradeClick}>
                                <ArrowUp className="mr-2 h-4 w-4 text-white" />
                                Upgrade to Add Members
                            </Button>
                        ) : (
                            <Button className="h-11 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white hover:opacity-90 border-0" onClick={() => setShowInviteModal(true)} isLoading={isValidating}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Member
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* 🟢 TOP METRICS - COLORED INSIGHT CARDS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {/* Active Members */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--info)]/30 bg-gradient-to-br from-[var(--info)]/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-[var(--info)]">
                        <Users className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Members</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">{members.length}</span>
                </div>

                {/* Pending Invites */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--warning)]/30 bg-gradient-to-br from-[var(--warning)]/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-[var(--warning)]">
                        <Mail className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pending Invites</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">{invites.length}</span>
                </div>

                {/* Admins & Owners */}
                <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center gap-3 text-purple-500">
                        <Crown className="h-5 w-5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Owners / Admins</h3>
                    </div>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {members.filter((member) => member.role?.toUpperCase() === 'OWNER' || member.role?.toUpperCase() === 'ADMIN').length}
                    </span>
                </div>

                {/* Seats Used */}
                {validationResult && validationResult.limit !== -1 && (
                    <div className="relative overflow-hidden group flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:shadow-md hover:border-[var(--accent)]/30 hover:-translate-y-1">
                        <div className="flex items-center gap-3 text-[var(--text-primary)]">
                            <Shield className="h-5 w-5" />
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Seats Used</h3>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                                    {validationResult.used} <span className="text-base text-[var(--text-muted)] font-bold">/ {validationResult.limit}</span>
                                </span>
                                <span className="text-xs font-bold text-[var(--accent)]">{Math.round((validationResult.used / validationResult.limit) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${validationResult.used >= validationResult.limit ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`}
                                    style={{ width: `${Math.min((validationResult.used / validationResult.limit) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!isManagerOrOwner && (
                <InlineAlert
                    variant="info"
                    title="Limited Access"
                    description="Only Owners and Admins can invite members, remove users, or change workspace-level permissions."
                />
            )}

            {/* 🟢 MEMBER LIST REDESIGN */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Active Members</h2>
                        <p className="text-sm text-[var(--text-muted)]">Manage permissions and workspace access.</p>
                    </div>
                    <Badge variant="outline" className="px-3 py-1 text-sm font-bold">{members.length} Active</Badge>
                </div>

                <div className="space-y-3">
                    {members.map((member) => {
                        const isCurrentUser = member.user_id === user?.userId;
                        const canEditMember = myRole === 'OWNER' && !isCurrentUser;
                        
                        return (
                            <div key={member.user_id} className="group flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border)]/80">
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isCurrentUser ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)]'} text-lg font-extrabold shadow-inner`}>
                                        {(member.full_name || member.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{member.full_name || 'No name provided'}</p>
                                            <RoleBadge role={member.role} isCurrentUser={isCurrentUser} />
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 lg:items-end">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-xs font-semibold text-[var(--text-muted)] mr-2">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                                        
                                        {canEditMember && (
                                            <select
                                                value={member.role?.toUpperCase()}
                                                onChange={(e) => handleChangeMember(member.user_id, 'role', e.target.value)}
                                                className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none transition-all hover:bg-[var(--bg-hover)] focus:ring-2 focus:ring-[var(--accent)]/20"
                                            >
                                                <option value="OWNER">Owner</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="CREATOR">Creator</option>
                                                <option value="VIEWER">Viewer</option>
                                            </select>
                                        )}
                                        
                                        {isCurrentUser && member.role?.toUpperCase() !== 'OWNER' && (
                                            <Button variant="danger" size="sm" className="rounded-xl font-bold bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white border-0" onClick={() => setConfirmLeaveOpen(true)}>
                                                <Shield className="h-4 w-4 mr-1.5" /> Leave
                                            </Button>
                                        )}
                                        {myRole === 'OWNER' && member.role?.toUpperCase() !== 'OWNER' && !isCurrentUser && (
                                            <Button variant="secondary" size="sm" className="rounded-xl font-bold border-[var(--border)] hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-600" onClick={() => setPendingTransferMember(member)}>
                                                <Crown className="h-4 w-4 mr-1.5" /> Make Owner
                                            </Button>
                                        )}
                                        {isManagerOrOwner && member.role?.toUpperCase() !== 'OWNER' && !isCurrentUser && (
                                            <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]" onClick={() => setPendingRemoveMember(member)}>
                                                <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 🟢 PENDING INVITES */}
            {invites.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Pending Invites</h2>
                            <p className="text-sm text-[var(--text-muted)]">Manage outstanding invitations to join the workspace.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {invites.map((invite) => {
                            const isExpired = new Date(invite.expires_at) < new Date();
                            return (
                                <div key={invite.id} className="group flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/30 transition-all duration-200 hover:bg-[var(--bg-card)] hover:border-[var(--border)]/80 hover:shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-inner">
                                            <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{invite.email}</p>
                                                <RoleBadge role={invite.role} />
                                            </div>
                                            <p className="text-[13px] text-[var(--text-muted)]">
                                                Sent {invite.inviter_name ? `by ${invite.inviter_name}` : ''} • {isExpired ? <span className="text-[var(--danger)] font-bold">Expired</span> : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {(isManagerOrOwner || invite.inviter_id === user?.userId) && (
                                            <>
                                                <Button variant="secondary" size="sm" className="rounded-xl font-bold bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]" onClick={() => handleResendInvite(invite)} isLoading={resendingInviteId === invite.id}>
                                                    <RefreshCcw className="h-4 w-4 mr-1.5" /> Resend
                                                </Button>
                                                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]" onClick={() => setPendingCancelInvite(invite)}>
                                                    <X className="h-4 w-4 mr-1.5" /> Cancel
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 🟢 ROLES & PERMISSIONS MATRIX */}
            <div className="space-y-6 pt-8">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[var(--accent)]" /> Roles & Permissions
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Review the access levels available for workspace members.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Owner Card */}
                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                                <Crown className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)]">Owner</h3>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Full Control</p>
                        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Can delete the workspace, manage billing, domains, and all team access.</p>
                    </div>

                    {/* Admin Card */}
                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)]">Admin</h3>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Operational Control</p>
                        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Can invite members, configure sending domains, and manage settings.</p>
                    </div>

                    {/* Creator Card */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                <Edit3 className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)]">Creator</h3>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Content Producer</p>
                        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Can build campaigns, manage contacts, and view analytics.</p>
                    </div>

                    {/* Viewer Card */}
                    <div className="rounded-2xl border border-slate-500/20 bg-gradient-to-b from-slate-500/5 to-transparent p-5 transition-transform hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600">
                                <Eye className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)]">Viewer</h3>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Read-Only</p>
                        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Can view campaign performance and analytics dashboards.</p>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <ModalShell
                isOpen={showInviteModal}
                onClose={() => {
                    if (inviteStatus === 'sending') return;
                    setShowInviteModal(false);
                    resetInviteForm();
                }}
                title="Invite Team Member"
                description="An invitation link will be sent to their email. Choose the workspace role before sending."
                maxWidthClass="max-w-md"
            >
                <form onSubmit={handleSendInvite} className="space-y-6">
                    {validationResult?.status === 'LIMIT_EXCEEDED' || (validationResult?.limit !== undefined && validationResult.limit !== -1 && validationResult.remaining <= 0) ? (
                        <div className="space-y-6">
                            <div className="rounded-[var(--radius-lg)] border border-[var(--danger-border)] bg-[var(--danger-bg)]/20 p-6">
                                <div className="flex items-center gap-3 text-[var(--danger)]">
                                    <AlertTriangle className="h-6 w-6" />
                                    <h3 className="text-base font-bold">
                                        {validationResult?.limit === 1 ? 'Not Available on Your Plan' : 'Team Limit Reached'}
                                    </h3>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    {validationResult?.limit === 1 ? (
                                        <p className="text-[var(--text-muted)]">
                                            Team members are not included in the <strong>Free</strong> plan. Upgrade to Starter or above to invite colleagues to your workspace.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-[var(--text-muted)]">Your plan allows:</span>
                                                <span className="font-semibold text-[var(--text-primary)]">{validationResult?.limit} user{validationResult?.limit !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[var(--text-muted)]">Current total:</span>
                                                <span className="font-semibold text-[var(--text-primary)]">{validationResult?.current} member{validationResult?.current !== 1 ? 's' : ''}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button type="button" onClick={handleUpgradeClick} fullWidth className="h-12 text-base font-bold bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white">
                                    Upgrade Plan
                                </Button>
                                <Button type="button" variant="ghost" className="h-12 font-bold" onClick={() => { setShowInviteModal(false); resetInviteForm(); }} fullWidth>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--text-primary)]">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    autoFocus
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-[var(--text-primary)]">Workspace Role</label>
                                    <div className="grid gap-3">
                                        {(user?.role === 'ADMIN' ? ['CREATOR', 'VIEWER'] as const : ['ADMIN', 'CREATOR', 'VIEWER'] as const).map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setInviteRole(role)}
                                                disabled={validationResult?.used >= validationResult?.limit && validationResult?.limit !== -1}
                                                className={`rounded-xl border p-4 text-left transition-all duration-200 ${inviteRole === role ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-2 ring-[var(--accent)]/20' : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'} disabled:opacity-50`}
                                            >
                                                <p className="text-sm font-bold text-[var(--text-primary)] capitalize flex items-center gap-2">
                                                    {role === 'ADMIN' && <Zap className="w-4 h-4 text-blue-500" />}
                                                    {role === 'CREATOR' && <Edit3 className="w-4 h-4 text-emerald-500" />}
                                                    {role === 'VIEWER' && <Eye className="w-4 h-4 text-slate-500" />}
                                                    {role.toLowerCase()}
                                                </p>
                                                <p className="mt-1 text-[13px] text-[var(--text-muted)] font-medium">
                                                    {role === 'ADMIN' ? 'Full workspace management, domains, and team access.' : 
                                                     role === 'CREATOR' ? 'Create campaigns and manage contacts.' : 
                                                     'Read-only access to analytics and campaigns.'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {pendingInviteError && (
                                <InlineAlert
                                    variant="danger"
                                    title="Failed to send invite"
                                    description={inviteError || 'The user may already exist in an isolated state or the invitation could not be created.'}
                                    icon={<AlertTriangle className="mt-0.5 h-4 w-4" />}
                                />
                            )}

                            <div className="flex items-center gap-3 pt-6 border-t border-[var(--border)]/60">
                                <Button type="submit" className="h-11 px-8 rounded-xl font-bold flex-1" isLoading={inviteStatus === 'sending'} disabled={inviteStatus === 'success' || (validationResult?.used >= validationResult?.limit && validationResult?.limit !== -1)}>
                                    Send Invitation
                                </Button>
                                <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl font-bold flex-1" onClick={() => { setShowInviteModal(false); resetInviteForm(); }} disabled={inviteStatus === 'sending'}>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </ModalShell>

            <ConfirmModal
                isOpen={Boolean(pendingRoleChange)}
                onClose={() => setPendingRoleChange(null)}
                onConfirm={confirmRoleChange}
                title="Change Member Role"
                message={`Are you sure you want to change the role for ${pendingRoleChange?.email} to ${pendingRoleChange?.role}? This will immediately alter their permissions.`}
                confirmLabel="Confirm Change"
                isLoading={confirmBusy}
            />

            <ConfirmModal
                isOpen={Boolean(pendingRemoveMember)}
                onClose={() => setPendingRemoveMember(null)}
                onConfirm={handleRemoveMember}
                title="Remove Member"
                message={pendingRemoveMember ? `Are you sure you want to remove ${pendingRemoveMember.email}? They will instantly lose access to all campaigns, contacts, and workspace history.` : 'Remove this member.'}
                confirmLabel="Remove Member"
                isLoading={confirmBusy && Boolean(pendingRemoveMember)}
                variant="danger"
            />

            <ConfirmModal
                isOpen={Boolean(pendingCancelInvite)}
                onClose={() => setPendingCancelInvite(null)}
                onConfirm={handleCancelInvite}
                title="Cancel Invitation"
                message={pendingCancelInvite ? `This will invalidate the invite sent to ${pendingCancelInvite.email}. The link will no longer work.` : 'Cancel this invitation.'}
                confirmLabel="Cancel Invitation"
                isLoading={confirmBusy && Boolean(pendingCancelInvite)}
                variant="warning"
            />

            <ConfirmModal
                isOpen={confirmLeaveOpen}
                onClose={() => setConfirmLeaveOpen(false)}
                onConfirm={handleLeaveWorkspace}
                title="Leave Workspace"
                message="Are you sure you want to leave this workspace? You will be logged out and lose access immediately."
                confirmLabel="Leave Workspace"
                isLoading={confirmBusy}
                variant="danger"
            />

            <ConfirmModal
                isOpen={Boolean(pendingTransferMember)}
                onClose={() => setPendingTransferMember(null)}
                onConfirm={handleTransferOwnership}
                title="Transfer Ownership"
                message={pendingTransferMember ? `Are you absolutely sure you want to make ${pendingTransferMember.email} the Owner? Your role will automatically be downgraded to Admin.` : 'Transfer ownership.'}
                confirmLabel="Transfer Ownership"
                isLoading={confirmBusy && Boolean(pendingTransferMember)}
                variant="warning"
            />
        </div>
    );
}
