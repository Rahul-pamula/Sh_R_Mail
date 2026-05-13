'use client';

import { useEffect, useMemo, useState } from 'react';
import { MailCheck, Plus, RefreshCw, ShieldAlert, Trash2, ChevronRight, Info, CheckCircle2, Clock, AlertCircle, Mail, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/utils/permissions';
import { Badge, Button, ConfirmModal, EmptyState, InlineAlert, Input, PageHeader, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface SenderIdentity {
    id: string;
    email: string;
    status: 'pending' | 'verified';
    created_at: string;
}

interface Domain {
    id: string;
    domain_name: string;
    status: 'pending' | 'verified' | 'failed';
}

export default function SenderIdentitiesPage() {
    const { token, user } = useAuth();
    const { success, error, info } = useToast();

    const [senders, setSenders] = useState<SenderIdentity[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prefixInput, setPrefixInput] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [pendingDelete, setPendingDelete] = useState<SenderIdentity | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const verifiedDomains = useMemo(() => domains.filter((domain) => domain.status === 'verified'), [domains]);

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            const [sendersRes, domainsRes] = await Promise.all([
                fetch(`${API_BASE}/senders`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/senders/domains`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (sendersRes.ok) {
                const senderData = await sendersRes.json();
                setSenders(senderData.data || []);
            }
            if (domainsRes.ok) {
                const domainData = await domainsRes.json();
                const allDomains = domainData.data || [];
                setDomains(allDomains);

                const firstVerified = allDomains.find((domain: Domain) => domain.status === 'verified');
                if (firstVerified) {
                    setSelectedDomain((current) => current || firstVerified.domain_name);
                }
            }
        } catch (fetchError) {
            console.error(fetchError);
            error('Failed to load sender identities.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSender = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prefixInput || !selectedDomain) {
            setErrorMessage('Please enter a prefix and select a verified domain.');
            return;
        }

        setErrorMessage('');
        setIsSubmitting(true);

        const fullEmail = `${prefixInput}@${selectedDomain}`;

        try {
            const res = await fetch(`${API_BASE}/senders`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: fullEmail }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to add sender. Please ensure the domain is verified.');
            }

            setPrefixInput('');
            success(`Verification started for ${fullEmail}.`);
            await fetchData();
        } catch (submitError: any) {
            setErrorMessage(submitError.message || 'Failed to add sender.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async (email: string) => {
        try {
            const res = await fetch(`${API_BASE}/senders`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (data.detail !== 'Sender email already registered in your workspace.') {
                    throw new Error(data.detail || 'Failed to resend verification.');
                }
            }

            info('Verification email resent. Please check your inbox.');
        } catch (resendError: any) {
            error(resendError.message || 'An error occurred while resending verification.');
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;

        setDeletingId(pendingDelete.id);
        try {
            const res = await fetch(`${API_BASE}/senders/${pendingDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to delete sender identity.');
            }

            success(`Removed ${pendingDelete.email}.`);
            setPendingDelete(null);
            await fetchData();
        } catch (deleteError: any) {
            error(deleteError.message || 'An error occurred while deleting the sender.');
        } finally {
            setDeletingId(null);
        }
    };

    const checkStatus = async () => {
        setIsLoading(true);
        await fetchData();
    };

    const metrics = [
        { label: 'Verified Senders', value: senders.filter((sender) => sender.status === 'verified').length.toString(), icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
        { label: 'Pending', value: senders.filter((sender) => sender.status === 'pending').length.toString(), icon: <Clock className="h-5 w-5 text-amber-500" /> },
        { label: 'Domains', value: verifiedDomains.length.toString(), icon: <ShieldAlert className="h-5 w-5 text-blue-500" /> },
    ];

    return (
        <div className="space-y-10 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <PageHeader
                title="Sender Identities"
                subtitle="Guided setup for your campaign FROM addresses. Verify each inbox to ensure maximum deliverability and trust."
            />

            {/* 🟢 TOP METRICS - INSIGHT CARDS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {metrics.map((metric) => (
                    <div key={metric.label} className="group p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] group-hover:scale-110 transition-transform">
                                {metric.icon}
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{metric.label}</p>
                                <p className="text-3xl font-black text-[var(--text-primary)]">{metric.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {verifiedDomains.length === 0 && (
                <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-amber-900">Verified domain required</h3>
                        <p className="text-sm text-amber-800/70 mt-1">
                            You need at least one verified domain before adding sender identities. Head over to <a href="/settings/domain" className="font-bold underline">Domain Settings</a> to get started.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-8">
                    {/* 🟢 GUIDED SENDER CREATION */}
                    {can(user, 'sender:manage') && (
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-[var(--border)]/60 bg-[var(--bg-secondary)]/30">
                                <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Setup New Sender</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Complete these steps to activate a new sending identity.</p>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                {/* STEP INDICATORS */}
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-black shadow-lg shadow-[var(--accent)]/20">1</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Configure</span>
                                    </div>
                                    <div className="h-[2px] flex-1 bg-[var(--border)] mx-4 -mt-6 opacity-40" />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] flex items-center justify-center font-black">2</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Verify</span>
                                    </div>
                                    <div className="h-[2px] flex-1 bg-[var(--border)] mx-4 -mt-6 opacity-40" />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] flex items-center justify-center font-black">3</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ready</span>
                                    </div>
                                </div>

                                <form onSubmit={handleAddSender} className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Mailbox Name</label>
                                            <Input
                                                value={prefixInput}
                                                onChange={(e) => setPrefixInput(e.target.value.replace(/[^a-zA-Z0-9.\-_]/g, ''))}
                                                placeholder="e.g. support"
                                                className="h-12 rounded-2xl border-[var(--border)] focus:ring-4 focus:ring-[var(--accent)]/10"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">At Domain</label>
                                            <select
                                                value={selectedDomain}
                                                onChange={(e) => setSelectedDomain(e.target.value)}
                                                className="w-full h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all appearance-none cursor-pointer"
                                                required
                                            >
                                                {verifiedDomains.length === 0 ? (
                                                    <option value="">No verified domains</option>
                                                ) : (
                                                    verifiedDomains.map((domain) => (
                                                        <option key={domain.id} value={domain.domain_name}>@{domain.domain_name}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* LIVE PREVIEW */}
                                    <div className="p-6 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/20 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Live Identity Preview</span>
                                            <Badge variant="outline" className="text-[9px] font-black">FROM HEADER</Badge>
                                        </div>
                                        <div className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                                            <div className="h-10 w-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-[var(--text-muted)] font-bold mb-0.5">Sender Address</p>
                                                <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">
                                                    {prefixInput || 'prefix'}@{selectedDomain || 'domain.com'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        isLoading={isSubmitting} 
                                        disabled={!prefixInput || !selectedDomain || verifiedDomains.length === 0}
                                        className="w-full h-12 rounded-2xl bg-[var(--accent)] text-white font-black transition-all hover:shadow-lg hover:shadow-[var(--accent)]/20 active:scale-95"
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        Create & Send Verification
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* 🟢 ACTIVE SENDERS LIST */}
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)]/60 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Active Sender Identities</h2>
                                <p className="text-sm text-[var(--text-muted)]">Verified addresses ready for campaign use.</p>
                            </div>
                            <button onClick={() => checkStatus()} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]">
                                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        <div className="divide-y divide-[var(--border)]/60">
                            {isLoading ? (
                                <div className="p-12 text-center text-sm font-bold text-[var(--text-muted)] animate-pulse">Syncing identities...</div>
                            ) : senders.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="h-20 w-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6">
                                        <MailCheck className="h-10 w-10 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">No senders yet</h3>
                                    <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">Add your first sender identity above to start configuring campaigns.</p>
                                </div>
                            ) : (
                                senders.map((sender) => (
                                    <div key={sender.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 hover:bg-[var(--bg-secondary)]/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                                                {sender.status === 'verified' ? <MailCheck className="h-6 w-6 text-green-500" /> : <Clock className="h-6 w-6 text-amber-500" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent)] transition-colors">{sender.email}</p>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                                                    Added {new Date(sender.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 ml-16 md:ml-0">
                                            <Badge variant={sender.status === 'verified' ? 'success' : 'warning'} className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                                                {sender.status}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                                {can(user, 'sender:manage') && (
                                                    <>
                                                        {sender.status === 'pending' && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleResend(sender.email)}
                                                                className="h-9 px-4 rounded-xl text-[var(--accent)] hover:bg-[var(--accent)]/10 font-bold"
                                                            >
                                                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                                                Resend
                                                            </Button>
                                                        )}
                                                        <button 
                                                            onClick={() => setPendingDelete(sender)}
                                                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 🟢 GUIDANCE PANEL */}
                <div className="space-y-6">
                    <div className="p-8 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)]/30 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                                <Info className="h-5 w-5" />
                            </div>
                            <h3 className="font-black text-[var(--text-primary)] tracking-tight">Activation Guide</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex gap-4 group">
                                <div className="h-6 w-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[10px] font-black group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">1</div>
                                <div>
                                    <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1">Configure Address</p>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Choose a prefix and one of your verified sending domains.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 group">
                                <div className="h-6 w-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[10px] font-black group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">2</div>
                                <div>
                                    <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1">Check Your Inbox</p>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">A verification email from AWS SES is dispatched to that exact address.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 group">
                                <div className="h-6 w-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[10px] font-black group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">3</div>
                                <div>
                                    <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider mb-1">Click the Link</p>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Confirm ownership by clicking the link in the email. Then refresh this page.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-[var(--border)]/60">
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                                <Mail className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-blue-800/70 leading-relaxed uppercase tracking-wider">
                                    Only verified identities can be selected as FROM addresses in the campaign editor.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                            <ShieldAlert className="h-24 w-24" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Anti-Spoofing Note</h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed relative z-10">
                            We use industrial-grade verification to protect your brand reputation. Every individual mailbox must be verified to prevent unauthorized sending and ensure high inbox placement.
                        </p>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
                title="Remove identity?"
                message={pendingDelete ? `Are you sure you want to remove ${pendingDelete.email}? This address will no longer be available for sending.` : 'Remove this sender identity.'}
                confirmLabel="Remove Sender"
                isLoading={deletingId !== null}
            />
        </div>
    );
}
