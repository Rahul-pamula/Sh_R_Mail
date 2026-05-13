'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarClock, CheckCircle2, CreditCard, TrendingUp, Users, Zap, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/utils/permissions';
import { useRouter } from 'next/navigation';
import { Badge, Button, ConfirmModal, EmptyState, InlineAlert, PageHeader, SectionCard, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const PLAN_FEATURES: Record<string, string[]> = {
    Free: ['500 contacts', '1,000 emails/mo', '1 user', '1 domain', 'Basic analytics', 'Templates'],
    Starter: ['5,000 contacts', '25,000 emails/mo', '3 users', '3 domains', 'Basic automation', 'Segmentation', 'Email support'],
    Pro: ['50,000 contacts', '150,000 emails/mo', 'Unlimited users', 'Unlimited domains', 'Advanced automation', 'API access', 'Priority support'],
    Enterprise: ['500,000+ contacts', '1,000,000+ emails/mo', 'Dedicated IP', 'SLA', 'SSO/SAML', '24/7 support'],
};

const PLAN_PRICE_INR: Record<string, string> = {
    Free: '0',
    Starter: '799',
    Pro: '2,499',
    Enterprise: '9,999',
};

type Plan = {
    id: string;
    name: string;
    price_monthly: number;
    max_monthly_emails: number;
    max_contacts: number;
    max_users: number;
    max_domains: number;
    allow_custom_domain: boolean;
};

type BillingData = {
    plan_id: string;
    plan_details: Plan;
    billing_cycle_start: string;
    billing_cycle_end: string;
    scheduled_plan: Plan | null;
    scheduled_plan_effective_at: string | null;
    usage: { emails_sent_this_cycle: number; contacts_used: number };
    all_plans: Plan[];
};

type DialogState = { type: 'upgrade' | 'downgrade' | 'cancel'; plan?: Plan } | null;

function ProgressBar({ percent, className = '' }: { percent: number; className?: string }) {
    const safePercent = Math.min(100, Math.max(0, percent));
    const toneClass = safePercent >= 100 ? 'bg-[var(--danger)]' : safePercent >= 80 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]';

    return (
        <div className={`h-2.5 overflow-hidden rounded-full bg-[var(--border)]/50 ${className}`}>
            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${toneClass}`} style={{ width: `${safePercent}%` }} />
        </div>
    );
}

export default function BillingPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const { success, error: toastError } = useToast();

    useEffect(() => {
        if (user && !can(user, 'billing:view')) {
            router.replace('/dashboard');
        }
    }, [user, router]);

    const [data, setData] = useState<BillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [dialog, setDialog] = useState<DialogState>(null);

    const fetchBilling = async () => {
        if (!token) return;
        setLoading(true);
        setPageError('');
        try {
            const res = await fetch(`${API_BASE}/billing/plan`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to load billing info.');
            setData(await res.json());
        } catch (fetchError) {
            console.error(fetchError);
            setPageError('Failed to load billing info.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBilling(); }, [token]);

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const handleChangePlan = async () => {
        if (!dialog?.plan) return;
        setProcessing(true);
        try {
            const res = await fetch(`${API_BASE}/billing/change-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ plan_id: dialog.plan.id }),
            });
            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.detail || 'Failed to change plan.');
            success(responseData.message || 'Plan updated.');
            await fetchBilling();
        } catch (changeError: any) {
            toastError(changeError.message || 'Failed to change plan.');
        } finally {
            setProcessing(false);
            setDialog(null);
        }
    };

    const handleCancelDowngrade = async () => {
        setProcessing(true);
        try {
            const res = await fetch(`${API_BASE}/billing/cancel-downgrade`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.detail || 'Failed to cancel downgrade.');
            success(responseData.message || 'Scheduled downgrade canceled.');
            await fetchBilling();
        } catch (cancelError: any) {
            toastError(cancelError.message || 'Failed to cancel downgrade.');
        } finally {
            setProcessing(false);
            setDialog(null);
        }
    };

    const openDialog = (plan: Plan) => {
        if (!data) return;
        const type = plan.price_monthly > data.plan_details.price_monthly ? 'upgrade' : 'downgrade';
        setDialog({ type, plan });
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"></div>
            </div>
        );
    }

    if (!user || !can(user, 'billing:view')) {
        return null;
    }

    if (pageError || !data) {
        return (
            <div className="space-y-6 pb-8">
                <PageHeader title="Plan & Billing" subtitle="Manage your subscription, usage, and scheduled plan changes." />
                <InlineAlert variant="danger" title="Billing unavailable" description={pageError || 'No billing data found.'} />
            </div>
        );
    }

    const { plan_details, usage, billing_cycle_end, scheduled_plan, scheduled_plan_effective_at, all_plans } = data;
    const emailsPct = Math.min(100, Math.round((usage.emails_sent_this_cycle / plan_details.max_monthly_emails) * 100));
    const contactsPct = Math.min(100, Math.round((usage.contacts_used / plan_details.max_contacts) * 100));
    
    const isApproachingLimits = emailsPct >= 80 || contactsPct >= 80;

    return (
        <div className="space-y-10 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Plan & Billing</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Monitor your usage, review plan limits, and upgrade to unlock advanced features.
                    </p>
                </div>
            </div>

            {scheduled_plan && scheduled_plan_effective_at && (
                <div className="relative overflow-hidden rounded-3xl border border-[var(--warning)]/30 bg-gradient-to-r from-[var(--warning)]/10 to-[var(--warning)]/5 p-6 shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--warning)]" />
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 p-3 bg-[var(--warning)]/20 rounded-2xl text-[var(--warning)]">
                                <CalendarClock className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Downgrade scheduled</h2>
                                <p className="text-sm font-medium text-[var(--text-primary)] opacity-80 leading-relaxed">
                                    Your plan will change to {scheduled_plan.name} on {fmtDate(scheduled_plan_effective_at)}. Your current {plan_details.name} limits remain active until then.
                                </p>
                            </div>
                        </div>
                        {can(user, 'billing:manage') && (
                            <Button variant="secondary" onClick={() => setDialog({ type: 'cancel' })} className="whitespace-nowrap font-bold rounded-xl border border-[var(--warning)]/30 text-[var(--warning)] hover:bg-[var(--warning)]/10">
                                Cancel Downgrade
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {isApproachingLimits && !scheduled_plan && (
                <div className="relative overflow-hidden rounded-3xl border border-[var(--danger)]/30 bg-gradient-to-r from-[var(--danger)]/10 to-[var(--danger)]/5 p-6 shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--danger)]" />
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 p-3 bg-[var(--danger)]/20 rounded-2xl text-[var(--danger)]">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Approaching Capacity Limits</h2>
                            <p className="text-sm font-medium text-[var(--text-primary)] opacity-80 leading-relaxed">
                                You have used {Math.max(emailsPct, contactsPct)}% of your capacity this cycle. Consider upgrading to prevent delivery throttling.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 TOP INSIGHT CARDS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Current Subscription Card */}
                <div className="relative overflow-hidden group flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#6366f1] to-[var(--accent)] text-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 backdrop-blur-md">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Active Plan</span>
                            </div>
                            <Badge className="bg-white text-[var(--accent)] border-0 font-bold">₹{PLAN_PRICE_INR[plan_details.name] ?? plan_details.price_monthly}/mo</Badge>
                        </div>
                        <h3 className="text-3xl font-extrabold tracking-tight mb-1">{plan_details.name}</h3>
                        <p className="text-sm font-medium text-white/80">
                            {billing_cycle_end ? `Renews ${fmtDate(billing_cycle_end)}` : 'No renewal date'}
                        </p>
                    </div>
                </div>

                {/* Emails Usage */}
                <div className="relative overflow-hidden group flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div>
                        <div className="flex items-center gap-3 text-[var(--info)] mb-4">
                            <TrendingUp className="h-5 w-5" />
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Emails Sent</h3>
                        </div>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-extrabold text-[var(--text-primary)]">{usage.emails_sent_this_cycle.toLocaleString()}</span>
                            <span className="text-sm font-medium text-[var(--text-muted)] mb-1">/ {plan_details.max_monthly_emails.toLocaleString()}</span>
                        </div>
                    </div>
                    <div>
                        <ProgressBar percent={emailsPct} className="mb-2" />
                        <p className="text-xs font-semibold text-[var(--text-muted)] text-right">{emailsPct}% Used</p>
                    </div>
                </div>

                {/* Contacts Usage */}
                <div className="relative overflow-hidden group flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div>
                        <div className="flex items-center gap-3 text-[var(--success)] mb-4">
                            <Users className="h-5 w-5" />
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Contacts Stored</h3>
                        </div>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-extrabold text-[var(--text-primary)]">{usage.contacts_used.toLocaleString()}</span>
                            <span className="text-sm font-medium text-[var(--text-muted)] mb-1">/ {plan_details.max_contacts.toLocaleString()}</span>
                        </div>
                    </div>
                    <div>
                        <ProgressBar percent={contactsPct} className="mb-2" />
                        <p className="text-xs font-semibold text-[var(--text-muted)] text-right">{contactsPct}% Capacity</p>
                    </div>
                </div>
            </div>

            {/* 🟢 PRICING CARDS REDESIGN */}
            <div className="space-y-6 pt-4">
                <div className="text-center max-w-2xl mx-auto mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Scale Your Growth</h2>
                    <p className="text-sm text-[var(--text-muted)]">Upgrades apply immediately so your campaigns never skip a beat. Downgrades are scheduled for the next renewal.</p>
                </div>

                {all_plans.length === 0 ? (
                    <EmptyState title="No plans available" description="Billing plans will appear here once the backend returns available plan options." />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {all_plans.map((plan) => {
                            const isCurrent = plan.id === data.plan_id;
                            const isScheduled = plan.id === scheduled_plan?.id;
                            const isUpgrade = plan.price_monthly > plan_details.price_monthly;
                            const features = PLAN_FEATURES[plan.name] || [];
                            const isRecommended = plan.name === 'Pro' && (data.plan_details.name === 'Free' || data.plan_details.name === 'Starter');

                            return (
                                <div key={plan.id} className={`group relative flex flex-col rounded-3xl border p-6 transition-all duration-300 ${isCurrent ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md' : isRecommended ? 'border-[#6366f1] bg-[#6366f1]/5 shadow-md -translate-y-2' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border)]/80 hover:shadow-lg hover:-translate-y-1'}`}>
                                    {isRecommended && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <span className="bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full shadow-sm">
                                                Recommended
                                            </span>
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <span className="bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full shadow-sm">
                                                Current Plan
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-6 text-center mt-2">
                                        <h3 className={`text-xl font-bold mb-2 ${isRecommended ? 'text-[#6366f1]' : 'text-[var(--text-primary)]'}`}>{plan.name}</h3>
                                        <div className="flex items-end justify-center gap-1">
                                            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">₹{PLAN_PRICE_INR[plan.name] ?? plan.price_monthly}</span>
                                            <span className="text-sm font-medium text-[var(--text-muted)] mb-1">/mo</span>
                                        </div>
                                    </div>

                                    <ul className="mb-8 flex-1 space-y-3">
                                        {features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3 text-sm font-medium text-[var(--text-primary)] opacity-80">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-auto">
                                        {isCurrent ? (
                                            <Button variant="secondary" className="w-full h-11 rounded-xl font-bold border-2 border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent)]/10" disabled>Active</Button>
                                        ) : isScheduled ? (
                                            <Button variant="secondary" className="w-full h-11 rounded-xl font-bold border border-[var(--warning)]/50 text-[var(--warning)] bg-[var(--warning)]/10" disabled>Downgrade Scheduled</Button>
                                        ) : can(user, 'billing:manage') ? (
                                            <Button 
                                                className={`w-full h-11 rounded-xl font-bold shadow-sm transition-all ${isUpgrade ? 'bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white hover:opacity-90 hover:shadow-md border-0' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'}`} 
                                                onClick={() => openDialog(plan)}
                                            >
                                                {isUpgrade && <Zap className="h-4 w-4 mr-2" />}
                                                {isUpgrade ? 'Upgrade Now' : 'Downgrade'}
                                            </Button>
                                        ) : (
                                            <Button variant="secondary" className="w-full h-11 rounded-xl font-bold" disabled>
                                                {isUpgrade ? 'Upgrade' : 'Downgrade'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 🟢 HOW PLAN CHANGES WORK - INFO SECTION REDESIGN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-10 border-t border-[var(--border)]/60">
                <div className="p-6 rounded-3xl bg-[var(--bg-secondary)]/30 border border-[var(--border)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Immediate Upgrades</h4>
                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">
                        Upgrades take effect immediately. You instantly unlock the new contact capacities and advanced features without waiting for the next cycle.
                    </p>
                </div>
                
                <div className="p-6 rounded-3xl bg-[var(--bg-secondary)]/30 border border-[var(--border)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] mb-4">
                        <CalendarClock className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Scheduled Downgrades</h4>
                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">
                        Downgrades are scheduled for the end of your current billing cycle. You keep the full capacity you already paid for until renewal.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-[var(--bg-secondary)]/30 border border-[var(--border)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success)]/10 text-[var(--success)] mb-4">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Flexible Adjustments</h4>
                    <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">
                        Change your mind? Scheduled downgrades can be canceled securely at any point before they take effect with zero penalty.
                    </p>
                </div>
            </div>

            <ConfirmModal
                isOpen={Boolean(dialog)}
                onClose={() => setDialog(null)}
                onConfirm={dialog?.type === 'cancel' ? handleCancelDowngrade : handleChangePlan}
                title={dialog?.type === 'upgrade' ? `Upgrade to ${dialog.plan?.name}` : dialog?.type === 'downgrade' ? `Downgrade to ${dialog.plan?.name}` : 'Cancel scheduled downgrade'}
                message={
                    dialog?.type === 'upgrade' && dialog.plan
                        ? `Move to ${dialog.plan.name} immediately at ₹${PLAN_PRICE_INR[dialog.plan.name] ?? dialog.plan.price_monthly}/month.`
                        : dialog?.type === 'downgrade' && dialog.plan
                            ? `Schedule a move to ${dialog.plan.name}. Your current ${plan_details.name} limits stay active until ${billing_cycle_end ? fmtDate(billing_cycle_end) : 'the end of the cycle'}.`
                            : scheduled_plan
                                ? `Cancel the scheduled downgrade to ${scheduled_plan.name} and remain on ${plan_details.name}.`
                                : 'Confirm this billing change.'
                }
                confirmLabel={dialog?.type === 'upgrade' ? 'Upgrade Now' : dialog?.type === 'cancel' ? 'Keep Current Plan' : 'Schedule Downgrade'}
                variant={dialog?.type === 'upgrade' ? 'primary' : dialog?.type === 'cancel' ? 'warning' : 'warning'}
                isLoading={processing}
            >
                <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border)] text-sm font-medium text-[var(--text-primary)]">
                    {dialog?.type === 'upgrade' && dialog.plan ? (
                        <>
                            <p className="flex items-center gap-3"><Zap className="h-4 w-4 text-[var(--accent)]" /> Takes effect immediately</p>
                            <p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> New limit: {dialog.plan.max_contacts.toLocaleString()} contacts</p>
                        </>
                    ) : null}
                    {dialog?.type === 'downgrade' && dialog.plan ? (
                        <>
                            <p className="flex items-center gap-3"><CalendarClock className="h-4 w-4 text-[var(--warning)]" /> Takes effect on {billing_cycle_end ? fmtDate(billing_cycle_end) : 'renewal'}</p>
                            <p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Current {plan_details.name} limits stay active until then</p>
                        </>
                    ) : null}
                    {dialog?.type === 'cancel' && scheduled_plan ? (
                        <p className="flex items-start gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)] mt-0.5" /> You will remain on {plan_details.name} and continue with your current limits and features.</p>
                    ) : null}
                </div>
            </ConfirmModal>
        </div>
    );
}
