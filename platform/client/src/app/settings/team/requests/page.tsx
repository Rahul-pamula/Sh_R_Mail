'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ShieldAlert, Slash, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, EmptyState, InlineAlert, PageHeader, SectionCard, StatCard, TableToolbar, useToast } from '@/components/ui';

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
    const { token } = useAuth();
    const { success, error } = useToast();
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const requestsAbortRef = useRef<AbortController | null>(null);

    const fetchRequests = async () => {
        if (!token) return;
        setLoading(true);
        try {
            requestsAbortRef.current?.abort();
            const controller = new AbortController();
            requestsAbortRef.current = controller;
            const res = await fetch(`${API_BASE}/team/requests`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            if (res.ok) {
                setRequests(await res.json());
            } else {
                throw new Error('Failed to fetch access requests.');
            }
        } catch (fetchError: any) {
            if (fetchError.name !== 'AbortError') {
                console.error(fetchError);
                error('Failed to load access requests.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        return () => requestsAbortRef.current?.abort();
    }, [token]);

    const handleAction = async (requestId: string, action: 'approve' | 'deny' | 'blacklist') => {
        if (!token) return;
        setActionLoading(requestId);
        try {
            const res = await fetch(`${API_BASE}/team/requests/${requestId}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Action failed.');
            setRequests((current) => current.filter((request) => request.id !== requestId));
            success(action === 'approve' ? 'Access request approved.' : action === 'deny' ? 'Access request denied.' : 'Requester blocked.');
        } catch (actionError) {
            console.error(actionError);
            error('Could not complete that request action.');
        } finally {
            setActionLoading(null);
        }
    };

    const highRisk = requests.filter((request) => request.risk_score !== 'Low Risk').length;

    if (loading) {
        return <div className="p-12 text-sm text-[var(--text-muted)]">Fetching join requests...</div>;
    }

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Access Requests"
                subtitle="Review join attempts from your verified corporate domain and decide who should enter the workspace automatically."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Pending Requests" value={requests.length.toString()} icon={<UserPlus className="h-5 w-5" />} />
                <StatCard label="High Risk" value={highRisk.toString()} icon={<ShieldAlert className="h-5 w-5" />} />
                <StatCard label="Auto-Discovery" value="Active" icon={<CheckCircle2 className="h-5 w-5" />} />
            </div>

            <InlineAlert
                variant="info"
                title="Review policy"
                description="Approve trusted employees, deny uncertain requests, and block domains or actors that should never reappear in your workspace queue."
            />

            <SectionCard title="Pending Requests" description="Requests appear when someone signs up with a verified corporate domain and asks to join the workspace.">
                <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]">
                    <TableToolbar
                        title="Join Requests"
                        description="Access decisions here affect who can enter your workspace without a manual invite."
                        trailing={<Badge variant="outline">{requests.length} pending</Badge>}
                        className="rounded-none border-0 border-b border-[var(--border)]"
                    />

                    {requests.length === 0 ? (
                        <EmptyState
                            icon={<ShieldAlert className="h-10 w-10" />}
                            title="No pending requests"
                            description="When someone signs up with your verified corporate domain, they will appear here."
                        />
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {requests.map((request) => {
                                const isProcessing = actionLoading === request.id;
                                return (
                                    <div key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]">
                                                {(request.full_name || request.email).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">{request.full_name || 'Verification Pending'}</p>
                                                <p className="mt-1 text-sm text-[var(--text-muted)]">{request.email} • Requested {new Date(request.created_at).toLocaleDateString()}</p>
                                                <div className="mt-2">
                                                    <Badge variant={request.risk_score === 'Low Risk' ? 'success' : 'warning'}>{request.risk_score}</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="success" disabled={isProcessing} onClick={() => handleAction(request.id, 'approve')}>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="secondary" disabled={isProcessing} onClick={() => handleAction(request.id, 'deny')}>
                                                <XCircle className="h-4 w-4" />
                                                Deny
                                            </Button>
                                            <Button size="sm" variant="danger" disabled={isProcessing} onClick={() => handleAction(request.id, 'blacklist')}>
                                                <Slash className="h-4 w-4" />
                                                Block
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}
