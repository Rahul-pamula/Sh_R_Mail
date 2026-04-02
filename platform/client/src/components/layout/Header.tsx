'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, Menu, User, Settings, CreditCard, LogOut, ChevronDown, CheckCircle2, UserPlus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    setMobileMenuOpen?: () => void;
}

export default function Header({ setMobileMenuOpen }: HeaderProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    // Get initials for avatar
    const initials = (user.fullName || user.email || 'U').charAt(0).toUpperCase();

    // Map the internal role to a friendly label
    const roleLabel = user.role === 'owner' ? 'Owner' : user.role === 'admin' ? 'Admin' : 'Member';

    return (
        <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-primary)] px-6 flex items-center justify-between sticky top-0 z-50">
            {/* Left side: Mobile Menu (hidden on desktop) + Breadcrumb placeholder */}
            <div className="flex items-center gap-4 flex-1">
                <button 
                    onClick={() => setMobileMenuOpen?.()}
                    className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 -ml-2 rounded-lg hover:bg-[var(--bg-secondary)]"
                >
                    <Menu className="w-5 h-5" />
                </button>
                {/* Optional: Add dynamic breadcrumbs here based on pathname */}
                <div className="hidden md:block text-sm font-medium text-[var(--text-muted)] capitalize">
                    {pathname === '/dashboard' ? 'Overview' : pathname.split('/')[1]?.replace('-', ' ') || ''}
                </div>
            </div>

            {/* Middle: Search Bar */}
            <div className="flex-1 max-w-md hidden md:block">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search campaigns, templates..."
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border)] rounded">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right side: Notifications & Profile */}
            <div className="flex items-center gap-3 flex-1 justify-end relative" ref={dropdownRef}>
                {/* Notifications Button */}
                <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
                    <Bell className="w-5 h-5" />
                    {/* Notification Dot */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-primary)]"></span>
                </button>

                {/* Profile Avatar Button */}
                <div className="h-8 w-[1px] bg-[var(--border)] mx-1 hidden sm:block"></div>

                <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1 pr-2 rounded-full border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-all"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20">
                        {initials}
                    </div>
                    <div className="hidden sm:flex flex-col items-start text-left">
                        <span className="text-sm font-semibold text-[var(--text-primary)] leading-none mb-0.5">
                            {user.fullName || user.email.split('@')[0]}
                        </span>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        
                        {/* Header Info */}
                        <div className="px-4 py-3 border-b border-[var(--border)] mb-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.fullName || 'User'}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate mb-2">{user.email}</p>
                            
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    user.role === 'owner' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                    user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                }`}>
                                    {roleLabel}
                                </span>
                                {user.tenantStatus === 'active' && (
                                    <span className="text-xs text-[var(--success)] flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Active Workspace
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="px-2">
                            <Link 
                                href="/settings/profile" 
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            >
                                <User className="w-4 h-4" /> Personal Profile
                            </Link>

                            <Link 
                                href="/settings/organization" 
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            >
                                <Settings className="w-4 h-4" /> Workspace Settings
                            </Link>

                            <Link 
                                href="/settings/billing" 
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            >
                                <CreditCard className="w-4 h-4" /> Account & Billing
                            </Link>
                            
                            <button 
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors mt-1"
                            >
                                <RefreshCw className="w-4 h-4" /> Switch Account
                            </button>
                        </div>

                        <div className="h-[1px] bg-[var(--border)] my-2"></div>

                        {/* Logout */}
                        <div className="px-2">
                            <button 
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
