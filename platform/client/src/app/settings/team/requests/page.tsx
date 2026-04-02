'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, CheckCircle2, XCircle, ShieldAlert, Slash } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

interface JoinRequest {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    status: 'pending' | 'approved' | 'denied' | 'blocked';
    risk_score: string;
    created_at: string;
}

export default function RequestsPage() {
    const { token, user } = useAuth();
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchRequests = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/team/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setRequests(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [token]);

    const handleAction = async (requestId: string, action: 'approve' | 'deny' | 'blacklist') => {
        if (!token) return;
        setActionLoading(requestId);
        try {
            const res = await fetch(`${API_BASE}/team/requests/${requestId}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Instantly remove the card from the UI
                setRequests(reqs => reqs.filter(r => r.id !== requestId));
            } else {
                alert('Action failed');
            }
        } catch (e) {
            console.error(e);
            alert('Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="p-12 text-[var(--text-muted)] animate-pulse flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[var(--accent)] animate-spin" /> Fetching join requests...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Requests</h1>
                <p className="text-[var(--text-muted)] text-sm">Review employees attempting to join your workspace via Corporate Auto-Discovery.</p>
            </div>

            <div className="card">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] rounded-t-xl flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-400" /> Pending Requests ({requests.length})
                    </h3>
                </div>

                {requests.length === 0 ? (
                    <div className="p-10 text-center text-[var(--text-muted)] bg-[var(--bg-primary)] rounded-b-xl border-t border-[var(--border)]">
                        <ShieldAlert className="w-8 h-8 text-[var(--border)] mx-auto mb-3" />
                        <p className="font-medium text-[var(--text-primary)]">No pending requests</p>
                        <p className="text-sm mt-1">When someone signs up with your verified corporate domain, they will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border)] bg-[var(--bg-primary)] rounded-b-xl">
                        {requests.map(req => {
                            const dateStr = new Date(req.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric'
                            });
                            const isProcessing = actionLoading === req.id;

                            return (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold font-mono border border-blue-500/30">
                                            {(req.full_name || req.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                                                {req.full_name || 'Verification Pending'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{req.email} • Requested {dateStr}</p>

                                            <div className="flex items-center mt-2 gap-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${req.risk_score === 'Low Risk' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}>
                                                    {req.risk_score}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => handleAction(req.id, 'approve')}
                                            className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                                            title="Approve and promote to member"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                        </button>
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => handleAction(req.id, 'deny')}
                                            className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] border border-[var(--border)] rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                                            title="Deny request"
                                        >
                                            <XCircle className="w-4 h-4" /> Deny
                                        </button>
                                        <div className="w-[1px] h-6 bg-[var(--border)] mx-1 hidden md:block"></div>
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => handleAction(req.id, 'blacklist')}
                                            className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                                            title="Permanently block domain access"
                                        >
                                            <Slash className="w-4 h-4" /> Block
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
