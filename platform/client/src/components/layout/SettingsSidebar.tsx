'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ChevronLeft, Settings, User, Building2, CreditCard, Shield, Key, Globe,
    Users, UserPlus, Bell, Lock, Sliders, Store, History, MessageSquareDot,
    ArrowLeft, Mail
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can, Action } from '@/utils/permissions';

/* ============================================================
   SETTINGS SIDEBAR — Dedicated sidebar for settings mode
   ============================================================ */

type SettingsNavItem = { 
    label: string; 
    href: string; 
    icon: any; 
    action?: Action;
    section?: string;
};

const SETTINGS_NAV: { label: string; items: SettingsNavItem[] }[] = [
    {
        label: 'Account',
        items: [
            { href: '/settings/profile',       icon: User,      label: 'Profile' },
            { href: '/settings/preferences',   icon: Sliders,   label: 'Preferences' },
            { href: '/settings/security',      icon: Lock,      label: 'Security' },
            { href: '/settings/notifications', icon: Bell,      label: 'Notifications' },
        ],
    },
    {
        label: 'Workspace',
        items: [
            { href: '/settings/organization',  icon: Building2,         label: 'Organization', action: 'VIEW_SETTINGS' },
            { href: '/settings/team',          icon: Users,             label: 'Team Members', action: 'VIEW_SETTINGS' },
            { href: '/settings/franchises',    icon: Store,             label: 'Franchise Accounts', action: 'ADD_FRANCHISE' },
            { href: '/settings/requests',      icon: MessageSquareDot,  label: 'Workspace Requests', action: 'VIEW_SETTINGS' },
            { href: '/settings/billing',       icon: CreditCard,        label: 'Billing & Plan', action: 'VIEW_BILLING' },
            { href: '/settings/audit',         icon: History,           label: 'Audit History', action: 'VIEW_SETTINGS' },
        ],
    },
    {
        label: 'Infrastructure',
        items: [
            { href: '/settings/domain',        icon: Globe,     label: 'Sending Domain', action: 'VIEW_DOMAIN' },
            { href: '/settings/api-keys',      icon: Key,       label: 'API Keys', action: 'VIEW_SETTINGS' },
        ],
    },
];

interface SettingsSidebarProps {
    mobileMenuOpen?: boolean;
    setMobileMenuOpen?: (open: boolean) => void;
}

export default function SettingsSidebar({ mobileMenuOpen, setMobileMenuOpen }: SettingsSidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const isActive = (href: string) => 
        pathname === href || pathname.startsWith(href + '/');

    return (
        <>
            {/* Mobile backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen?.(false)}
                />
            )}

            <aside className={`
                flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
                border-r border-[var(--border)] z-50 fixed md:relative h-screen
                bg-[var(--bg-card)] backdrop-blur-xl w-[240px]
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>

                {/* Back to Dashboard */}
                <div className="h-[64px] shrink-0 flex items-center px-4 border-b border-[var(--border)]">
                    <Link 
                        href="/dashboard"
                        className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="px-4 py-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-[var(--text-primary)] leading-tight">Settings</h1>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Configuration</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 pb-4 px-3 overflow-y-auto space-y-6">
                    {SETTINGS_NAV.map(section => (
                        <div key={section.label} className="space-y-1.5">
                            <p className="px-3 text-[10px] font-semibold tracking-widest uppercase text-[var(--text-muted)] opacity-50">
                                {section.label}
                            </p>
                            <ul className="space-y-0.5">
                                {section.items.map(item => {
                                    if (item.action && !can(user, item.action)) return null;
                                    
                                    const active = isActive(item.href);
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={`
                                                    group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                                                    ${active
                                                        ? 'text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20'
                                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'}
                                                `}
                                            >
                                                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[var(--accent)]' : 'group-hover:text-[var(--text-secondary)]'}`} />
                                                <span className="truncate">{item.label}</span>
                                                {active && (
                                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/50" />
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Bottom Profile Hint */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-hover)]/30">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)] uppercase">
                            {user?.email?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{user?.email}</p>
                            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-tighter">Current User</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
