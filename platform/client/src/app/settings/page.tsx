'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Bell, Building2, ChevronRight, CreditCard, Download, Globe, History, Key, 
    MailCheck, MessageSquareDot, Settings, Shield, Sliders, Sparkles, Store, 
    UserPlus, Users, CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const SETTINGS_SECTIONS = [
    {
        title: 'Account',
        description: 'Personal profile and notification preferences.',
        items: [
            { href: '/settings/preferences', icon: Sliders, title: 'Preferences', description: 'Manage your theme, timezone, and personal details.', status: 'configured' },
            { href: '/settings/notifications', icon: Bell, title: 'Notifications', description: 'Configure email alerts and system notifications.', status: 'configured' },
        ]
    },
    {
        title: 'Infrastructure',
        description: 'Core sending capabilities and integration keys.',
        items: [
            { href: '/settings/domain', icon: Globe, title: 'Sending Domain', description: 'Manage domain verification and DNS health.', priority: 'high', status: 'partial' },
            { href: '/settings/senders', icon: MailCheck, title: 'Sender Identities', description: 'Verify FROM addresses tied to your sending domains.', priority: 'high', status: 'missing' },
            { href: '/settings/api-keys', icon: Key, title: 'API Keys', description: 'Create and revoke credentials for product integrations.' },
        ]
    },
    {
        title: 'Workspace & Organization',
        description: 'Company details, team access, and operational governance.',
        items: [
            { href: '/settings/organization', icon: Building2, title: 'Organization', description: 'Set your company name and physical mailing address.' },
            { href: '/settings/team', icon: Users, title: 'Team Members', description: 'Invite colleagues and govern workspace access.', priority: 'normal' },
            { href: '/settings/billing', icon: CreditCard, title: 'Billing & Plan', description: 'Review your subscription, limits, and plan changes.', badge: 'Plan' },
            { href: '/settings/franchises', icon: Store, title: 'Franchise Accounts', description: 'Create and govern child workspaces without breaking isolation.' },
            { href: '/settings/requests', icon: MessageSquareDot, title: 'Workspace Requests', description: 'Admins submit billing or franchise requests.' },
            { href: '/settings/team/requests', icon: UserPlus, title: 'Access Requests', description: 'Approve or block join requests from your domain.' },
        ]
    },
    {
        title: 'Security & Compliance',
        description: 'Audit logs, data exports, and privacy management.',
        items: [
            { href: '/settings/compliance', icon: Shield, title: 'Compliance & GDPR', description: 'Manage exports, erasure requests, and consent.' },
            { href: '/settings/audit', icon: History, title: 'Audit History', description: 'Review team, franchise, and export activity.' },
            { href: '/settings/exports', icon: Download, title: 'Export History', description: 'Track contact exports and team member downloads.' },
        ]
    }
];

export default function SettingsPage() {
    const { token } = useAuth();
    const [plan, setPlan] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE}/billing/plan`, { headers: { Authorization: `Bearer ${token}` } })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => { if (data) setPlan(data.plan_details?.name ?? null); })
            .catch(() => {});
    }, [token]);

    const overallProgress = 70; // Represents a calculated readiness state

    return (
        <div className="space-y-8 pb-16 max-w-7xl mx-auto">
            
            {/* 🟢 HERO SECTION: Settings Status */}
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm">
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="accent" className="bg-[var(--accent)]/10 text-[var(--accent)] border-none px-3 py-1 text-xs">Control Center</Badge>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--warning-bg)]/20 border border-[var(--warning)]/20 text-[var(--warning)] text-xs font-bold uppercase tracking-wider shadow-inner">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--warning)] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--warning)]"></span>
                                </span>
                                Partial Configuration
                            </div>
                        </div>
                        <h1 className="heading-1">Workspace Settings</h1>
                        <p className="body-text">
                            Configure identity, infrastructure, billing, and operational governance from one consistent control surface.
                        </p>
                    </div>

                    <div className="w-full md:w-72 flex-shrink-0 bg-[var(--bg-secondary)]/30 p-6 rounded-xl border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">Setup Progress</span>
                            <span className="text-xl font-bold text-[var(--accent)] tracking-tighter">{overallProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-[var(--accent)] to-blue-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${overallProgress}%` }} />
                        </div>
                        <p className="mt-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 leading-relaxed">Infrastructure needs attention for full readiness.</p>
                    </div>
                </div>
            </div>

            {/* 📊 TOP METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                    <div className="h-11 w-11 rounded-lg bg-[var(--bg-secondary)] text-[var(--accent)] flex items-center justify-center shadow-inner">
                        <Settings className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Total Areas</p>
                        <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">14 Modules</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                    <div className="h-11 w-11 rounded-lg bg-[var(--bg-secondary)] text-[var(--success)] flex items-center justify-center shadow-inner">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Current Plan</p>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{plan || 'Loading...'}</p>
                            {plan && <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                    <div className="h-11 w-11 rounded-lg bg-[var(--bg-secondary)] text-[var(--warning)] flex items-center justify-center shadow-inner">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Security Posture</p>
                        <p className="text-lg font-bold text-[var(--warning)] tracking-tight">Action Required</p>
                    </div>
                </div>
            </div>

            {/* ⚡ RECOMMENDED SETUP */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 rounded-lg bg-[var(--ai-accent)]/10 text-[var(--ai-accent)]">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <h2 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]">Recommended Setup</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                    <div className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                        <div>
                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] text-[var(--warning)] flex items-center justify-center mb-4 shadow-inner">
                                <Globe className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Verify Domain</h3>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 mt-2">Unlock branded sending and improve deliverability by verifying your DNS.</p>
                        </div>
                        <Link href="/settings/domain" className="mt-6 text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors">
                            Configure now <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    
                    <div className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                        <div>
                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] text-[var(--danger)] flex items-center justify-center mb-4 shadow-inner">
                                <MailCheck className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Add Sender Identity</h3>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 mt-2">You need at least one verified sender email to dispatch campaigns.</p>
                        </div>
                        <Link href="/settings/senders" className="mt-6 text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors">
                            Add sender <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                        <div>
                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] text-[var(--success)] flex items-center justify-center mb-4 shadow-inner">
                                <Users className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Invite Your Team</h3>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 mt-2">Bring your colleagues in to help manage templates and audiences.</p>
                        </div>
                        <Link href="/settings/team" className="mt-6 text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors">
                            Manage team <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* 🧱 GROUPED SETTINGS SECTIONS */}
            <div className="space-y-14 pt-4">
                {SETTINGS_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-6">
                        <div className="pb-3 border-b border-[var(--border)]/30">
                            <h2 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]">{section.title}</h2>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-60 mt-1">{section.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isHighPriority = item.priority === 'high';
                                const isCompleted = item.status === 'configured';
                                
                                return (
                                    <Link 
                                        key={item.title} 
                                        href={item.href} 
                                        className={`group relative flex flex-col justify-between rounded-xl border p-6 transition-all hover-float-right shadow-sm
                                            ${isHighPriority ? 'border-[var(--warning)]/30 bg-[var(--bg-card)]' : 'border-[var(--border)] bg-[var(--bg-card)]'}
                                        `}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-all
                                                    ${isHighPriority 
                                                        ? 'border-[var(--warning)]/20 bg-[var(--bg-secondary)] text-[var(--warning)] shadow-inner' 
                                                        : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent-border)]'
                                                    }
                                                `}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                
                                                {/* Status Badges */}
                                                <div className="flex flex-col items-end gap-2">
                                                    {item.badge && plan && <Badge variant="outline" className="text-[8px] tracking-wider px-2 py-0.5 font-bold uppercase border-current/10">{plan}</Badge>}
                                                    {isHighPriority && <Badge variant="warning" className="uppercase text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full border-current/10">Action</Badge>}
                                                    {isCompleted && (
                                                        <div className="flex items-center text-[8px] font-bold uppercase tracking-widest text-[var(--success)] bg-[var(--success-bg)]/20 px-2 py-0.5 rounded-full border border-[var(--success)]/10">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest group-hover:text-[var(--accent)] transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="mt-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 line-clamp-2">
                                                {item.description}
                                            </p>
                                        </div>
                                        
                                        <div className={`mt-6 flex items-center text-[9px] font-bold uppercase tracking-widest transition-colors
                                            ${isHighPriority ? 'text-[var(--warning)]' : 'text-[var(--text-muted)] group-hover:text-[var(--accent)]'}
                                        `}>
                                            Manage <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
