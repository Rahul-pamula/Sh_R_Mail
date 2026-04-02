'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, ChevronLeft, Activity, Users, Zap, LayoutTemplate, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/* ============================================================
   SIDEBAR - Premium Dark Mode
   Uses CSS variables from globals.css for consistent theming
   ============================================================ */

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Events', href: '/events', icon: Zap },
    { name: 'Campaigns', href: '/campaigns', icon: Zap }, // Using Zap for campaigns too or a different icon
    { name: 'Templates', href: '/templates', icon: LayoutTemplate },
    { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    mobileMenuOpen?: boolean;
    setMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { logout } = useAuth();

    return (
        <>
            {/* Mobile backdrop */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden" 
                    onClick={() => setMobileMenuOpen?.(false)} 
                />
            )}
            <aside
                className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r border-[var(--border)] z-50 fixed md:relative h-screen bg-[var(--bg-card)] backdrop-blur-xl ${collapsed ? 'w-[72px]' : 'w-[260px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            >
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-[var(--border)]">
                {!collapsed && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[var(--shadow-glow)]">
                            <Mail className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-[15px] text-[var(--text-primary)] tracking-tight">
                            Email Engine
                        </span>
                    </div>
                )}
                {collapsed && (
                    <div className="w-full flex justify-center animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Mail className="w-4 h-4 text-white" />
                        </div>
                    </div>
                )}

                {/* Collapse Toggle */}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expand Toggle (when collapsed) */}
            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    className="absolute top-[88px] right-[-12px] bg-[var(--bg-card)] border border-[var(--border)] rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] shadow-md z-30 transition-transform hover:scale-110"
                >
                    <ChevronLeft className="w-3 h-3 rotate-180" />
                </button>
            )}

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
                <div className="mb-4 px-3 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                    {!collapsed && <span>Menu</span>}
                    {collapsed && <span className="flex justify-center">•</span>}
                </div>

                <ul className="space-y-1.5">
                    {navItems.map((item, i) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <li key={item.name} className={`stagger-${(i % 4) + 1} animate-slide-right`}>
                                <Link
                                    href={item.href}
                                    className={`
                                        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                        ${isActive
                                            ? 'text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'}
                                    `}
                                    title={collapsed ? item.name : undefined}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-violet-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    )}

                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-[var(--text-secondary)]'}`} />

                                    {!collapsed && (
                                        <span className="truncate">{item.name}</span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

        </aside>
        </>
    );
}
