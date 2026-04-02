'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, Mail, UserPlus, X, Trash2, CheckCircle2, AlertTriangle, Shield, Clock, Building2, Save, Loader2, Check } from 'lucide-react';


const API_BASE = 'http://127.0.0.1:8000';

interface Member {
    user_id: string;
    email: string;
    full_name: string | null;
    role: 'owner' | 'admin' | 'member';
    isolation_model?: 'team' | 'agency';
    joined_at: string;
}

interface Invite {
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    expires_at: string;
    created_at: string;
    inviter_id?: string;
}

export default function TeamSettingsPage() {
    const { token, user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [inviteIsolation, setInviteIsolation] = useState<'team' | 'agency'>('team');
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // Currently logged-in user's role
    const myRole = members.find(m => m.user_id === user?.userId)?.role || 'member';

    const fetchTeam = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [memRes, invRes] = await Promise.all([
                fetch(`${API_BASE}/team/members`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/team/invites`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (memRes.ok) setMembers(await memRes.json());
            if (invRes.ok) setInvites(await invRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, [token]);

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
                    isolation_model: inviteIsolation
                })
            });

            if (!res.ok) throw new Error(await res.text());

            setInviteStatus('success');
            setTimeout(() => {
                setShowInviteModal(false);
                setInviteStatus('idle');
                setInviteEmail('');
                setInviteRole('member');
                setInviteIsolation('team');
                fetchTeam();
            }, 1500);
        } catch (e) {
            console.error(e);
            setInviteStatus('error');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            await fetch(`${API_BASE}/team/members/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTeam();
        } catch (e) {
            console.error(e);
        }
    };

    const handleLeaveWorkspace = async () => {
        if (!confirm('⚠️ DANGER: Are you sure you want to leave this workspace? If you do, any domains or sender identities you verified here will be left behind or invalidated, and you will lose access to all campaigns. You will need a new invite to rejoin.')) return;
        
        try {
            const res = await fetch(`${API_BASE}/team/members/me/leave`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
                // Clear session and go to login
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                window.location.href = '/login';
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to leave workspace.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred.');
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;
        try {
            await fetch(`${API_BASE}/team/invites/${inviteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTeam();
        } catch (e) {
            console.error(e);
        }
    };

    const handleChangeMember = async (userId: string, field: 'role' | 'isolation_model', value: string) => {
        try {
            const res = await fetch(`${API_BASE}/team/members/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ [field]: value })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Update Failed');
            }
            fetchTeam();
        } catch (e: any) {
            alert(e.message || 'Failed to update member.');
        }
    };

    if (loading) return <div className="p-12 text-[var(--text-muted)] animate-pulse flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[var(--accent)] animate-spin" /> Loading team...</div>;

    const isAdminOrOwner = myRole === 'admin' || myRole === 'owner';

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Team Members</h1>
                <p className="text-[var(--text-muted)] text-sm">Manage who has access to your workspace and their permissions.</p>
            </div>

            {isAdminOrOwner && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn-premium flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" /> Invite Member
                    </button>
                </div>
            )}

            {/* Active Members */}
            <div className="card">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] rounded-t-xl flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" /> Active Members ({members.length})
                    </h3>
                </div>
                <div className="divide-y divide-[var(--border)] bg-[var(--bg-primary)] rounded-b-xl">
                    {members.map(m => (
                        <div key={m.user_id} className="p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono border border-indigo-500/30">
                                    {(m.full_name || m.email).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{m.full_name || 'No name provided'}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                
                                {/* Access Mode Badge/Dropdown */}
                                {myRole === 'owner' && m.user_id !== user?.userId && m.role !== 'owner' ? (
                                    <select
                                        value={m.isolation_model || 'team'}
                                        onChange={(e) => handleChangeMember(m.user_id, 'isolation_model', e.target.value)}
                                        className="bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="team">Team Mode</option>
                                        <option value="agency">Agency Mode</option>
                                    </select>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border)]">
                                        {m.role === 'owner' ? 'All Access' : `${m.isolation_model || 'team'} mode`}
                                    </span>
                                )}

                                {/* Role Badge/Dropdown */}
                                {myRole === 'owner' && m.user_id !== user?.userId ? (
                                    <select
                                        value={m.role}
                                        onChange={(e) => handleChangeMember(m.user_id, 'role', e.target.value)}
                                        className="bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] rounded px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="owner">Owner</option>
                                        <option value="admin">Admin</option>
                                        <option value="member">Member</option>
                                    </select>
                                ) : (
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border ${m.role === 'owner' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                        m.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)]'
                                        }`}>
                                        {m.role} {m.user_id === user?.userId && '(You)'}
                                    </span>
                                )}

                                {/* Leave Workspace Button (For the logged-in user) */}
                                {m.user_id === user?.userId && m.role !== 'owner' && (
                                    <button
                                        onClick={handleLeaveWorkspace}
                                        className="text-[var(--text-muted)] hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded transition-colors ml-2"
                                        title="Leave workspace"
                                    >
                                        <Shield className="w-4 h-4 mr-1 inline" />Leave
                                    </button>
                                )}

                                {/* Remove Button */}
                                {isAdminOrOwner && m.role !== 'owner' && m.user_id !== user?.userId && (
                                    <button
                                        onClick={() => handleRemoveMember(m.user_id)}
                                        className="text-[var(--text-muted)] hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded transition-colors ml-2"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending Invites */}
            {invites.length > 0 && (
                <div className="card mt-8">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] rounded-t-xl">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" /> Pending Invites ({invites.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-[var(--border)] bg-[var(--bg-primary)] rounded-b-xl">
                        {invites.map(inv => {
                            const isExpired = new Date(inv.expires_at) < new Date();
                            return (
                                <div key={inv.id} className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center border border-[var(--border)]">
                                            <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{inv.email}</p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Invited as <span className="uppercase text-[10px] tracking-wider font-semibold text-[var(--text-secondary)]">{inv.role}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {isExpired ? (
                                            <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expired</span>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">Expires {new Date(inv.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        )}
                                        
                                        {(isAdminOrOwner || inv.inviter_id === user?.userId) && (
                                            <button
                                                onClick={() => handleCancelInvite(inv.id)}
                                                className="text-[var(--text-muted)] hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded transition-colors"
                                                title="Cancel invitation"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Permissions Matrix */}
            <div className="card mt-8">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] rounded-t-xl flex justify-between items-center">
                     <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-400" /> Roles & Isolation Permissions
                     </h3>
                </div>
                <div className="overflow-x-auto bg-[var(--bg-primary)] rounded-b-xl pb-4">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] select-none">
                                <th className="px-6 py-4 font-semibold w-[40%]">Action</th>
                                <th className="px-6 py-4 font-semibold text-center w-[15%] text-amber-500">Owner</th>
                                <th className="px-6 py-4 font-semibold text-center w-[15%] text-indigo-400">Admin</th>
                                <th className="px-6 py-4 font-semibold text-center w-[15%] text-sky-400">Team Member</th>
                                <th className="px-6 py-4 font-semibold text-center w-[15%] text-[var(--text-muted)]">Agency Member</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {/* Campaigns & Contacts */}
                            <tr className="bg-[var(--bg-secondary)]/50 uppercase text-[10px] tracking-wider font-bold text-[var(--text-muted)]"><td colSpan={5} className="px-6 py-2">Campaigns & Contacts</td></tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">View shared workspace data</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                            </tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">View only own data</td>
                                <td className="px-6 py-3 text-center"><span className="text-xs text-[var(--text-muted)]">N/A</span></td>
                                <td className="px-6 py-3 text-center"><span className="text-xs text-[var(--text-muted)]">N/A</span></td>
                                <td className="px-6 py-3 text-center"><span className="text-xs text-[var(--text-muted)]">N/A</span></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                            </tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">Create campaign / import contacts</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                            </tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">Edit other members' campaigns</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                            </tr>
                            
                            {/* Workspace & Team */}
                            <tr className="bg-[var(--bg-secondary)]/50 uppercase text-[10px] tracking-wider font-bold text-[var(--text-muted)]"><td colSpan={5} className="px-6 py-2">Workspace & Administrative</td></tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">Add / verify sending domain</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                            </tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">Invite / remove members</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                            </tr>
                            <tr className="hover:bg-[var(--bg-secondary)]/30">
                                <td className="px-6 py-3 font-medium text-[var(--text-primary)]">Manage isolation modes & roles</td>
                                <td className="px-6 py-3 text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                                <td className="px-6 py-3 text-center"><X className="w-4 h-4 mx-auto text-red-500" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-8 max-w-xl w-full shadow-2xl relative">
                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center mb-4 text-indigo-400">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Invite Team Member</h2>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                An invitation link will be sent to their email. Set their role and access isolation mode below.
                            </p>
                        </div>

                        <form onSubmit={handleSendInvite} className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Workspace Role</label>
                                    <div className="space-y-3">
                                        {(['member', 'admin'] as const).map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setInviteRole(role)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${inviteRole === role
                                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:border-indigo-500/40 hover:bg-[var(--bg-hover)]'
                                                    }`}
                                            >
                                                <Shield className={`w-4 h-4 shrink-0 ${inviteRole === role ? 'text-indigo-400' : 'text-[var(--text-muted)]'}`} />
                                                <div>
                                                    <div className="text-sm font-semibold capitalize bg-transparent">{role}</div>
                                                    <div className="text-[10px] leading-tight mt-0.5 opacity-80 bg-transparent">
                                                        {role === 'admin' ? 'Manage billing & domains' : 'Manage campaigns'}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Isolation Mode Selection */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Access Mode</label>
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setInviteIsolation('team')}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${inviteIsolation === 'team'
                                                ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                                                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:border-sky-500/40 hover:bg-[var(--bg-hover)]'
                                                }`}
                                        >
                                            <Users className={`w-4 h-4 shrink-0 ${inviteIsolation === 'team' ? 'text-sky-400' : 'text-[var(--text-muted)]'}`} />
                                            <div>
                                                <div className="text-sm font-semibold bg-transparent">Team Mode</div>
                                                <div className="text-[10px] leading-tight mt-0.5 opacity-80 bg-transparent">Shares workspace data</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setInviteIsolation('agency')}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${inviteIsolation === 'agency'
                                                ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/40 hover:bg-[var(--bg-hover)]'
                                                }`}
                                        >
                                            <Building2 className={`w-4 h-4 shrink-0 ${inviteIsolation === 'agency' ? 'text-amber-400' : 'text-[var(--text-muted)]'}`} />
                                            <div>
                                                <div className="text-sm font-semibold bg-transparent">Agency Mode</div>
                                                <div className="text-[10px] leading-tight mt-0.5 opacity-80 bg-transparent">Sees only own data</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {inviteStatus === 'error' && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-medium mt-2 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    Failed to send invite. User may already be isolated.
                                </div>
                            )}

                            {inviteStatus === 'success' && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-medium mt-2 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Invite sent successfully!
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={inviteStatus === 'sending' || inviteStatus === 'success'}
                                className="w-full btn-premium flex justify-center py-3 mt-4"
                                style={inviteStatus === 'success' ? { background: '#10B981', color: 'white' } : {}}
                            >
                                {inviteStatus === 'sending' ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : inviteStatus === 'success' ? (
                                    'Sent!'
                                ) : (
                                    'Send Invitation Link'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
