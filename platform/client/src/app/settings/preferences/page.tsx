'use client';

import { useEffect, useState } from 'react';
import { Globe, Mail, Save, Clock, CalendarDays, Bell, AlertTriangle, BarChart2, CreditCard, Megaphone, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, InlineAlert, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

const DATE_FORMATS = [
    { value: 'MMM DD, YYYY', label: 'Jan 25, 2025' },
    { value: 'DD/MM/YYYY', label: '25/01/2025' },
    { value: 'MM/DD/YYYY', label: '01/25/2025' },
    { value: 'YYYY-MM-DD', label: '2025-01-25' },
];

type Prefs = {
    timezone: string;
    date_format: string;
    default_from_name: string;
};

type NotifPrefs = {
    campaign_completed: boolean;
    bounce_alert: boolean;
    weekly_digest: boolean;
    billing_warning: boolean;
    team_joined: boolean;
};

const NOTIFICATION_ITEMS: { key: keyof NotifPrefs; icon: any; label: string; description: string }[] = [
    { key: 'campaign_completed', icon: Megaphone, label: 'Campaign Completed', description: 'Get notified when a campaign finishes sending with a summary of results.' },
    { key: 'bounce_alert', icon: AlertTriangle, label: 'Bounce Alert', description: 'Immediate alert when your bounce rate triggers the circuit breaker.' },
    { key: 'weekly_digest', icon: BarChart2, label: 'Weekly Digest', description: 'A weekly summary of sends, opens, clicks, and deliverability health.' },
    { key: 'billing_warning', icon: CreditCard, label: 'Billing & Usage Warnings', description: 'Alerts when you approach plan limits or a payment fails.' },
    { key: 'team_joined', icon: Users, label: 'Team Activity', description: 'Notify when someone accepts a team invitation or requests access.' },
];

export default function PreferencesPage() {
    const { token } = useAuth();
    const { success, error } = useToast();
    
    // Core Preferences State
    const [prefs, setPrefs] = useState<Prefs>({
        timezone: 'UTC',
        date_format: 'MMM DD, YYYY',
        default_from_name: '',
    });

    // Notification Alerts State
    const [notifs, setNotifs] = useState<NotifPrefs>({
        campaign_completed: true,
        bounce_alert: true,
        weekly_digest: false,
        billing_warning: true,
        team_joined: false,
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        
        // Fetch both settings configurations concurrently
        Promise.all([
            fetch(`${API_BASE}/settings/preferences`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.ok ? res.json() : null),
            fetch(`${API_BASE}/settings/notifications`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.ok ? res.json() : null)
        ])
        .then(([prefData, notifData]) => {
            if (prefData) setPrefs(current => ({ ...current, ...prefData }));
            if (notifData) setNotifs(current => ({ ...current, ...notifData }));
        })
        .catch(() => {});
    }, [token]);

    const toggleNotif = (key: keyof NotifPrefs) => {
        setNotifs(current => ({ ...current, [key]: !current[key] }));
    };

    const save = async () => {
        setSaving(true);
        try {
            // Save both configurations concurrently
            const [prefRes, notifRes] = await Promise.all([
                fetch(`${API_BASE}/settings/preferences`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(prefs),
                }),
                fetch(`${API_BASE}/settings/notifications`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(notifs),
                })
            ]);

            if (!prefRes.ok || !notifRes.ok) throw new Error('Failed to save settings.');
            success('Personalization settings saved.');
        } catch (saveError) {
            console.error(saveError);
            error('Could not save all settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = Object.values(notifs).filter(Boolean).length;

    return (
        <div className="space-y-10 pb-16 max-w-5xl mx-auto animate-in fade-in duration-300">
            
            {/* 🟢 HERO HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Personalization</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Control your workspace behavior, formatting, and account notifications.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Button 
                        onClick={save} 
                        isLoading={saving} 
                        className="h-11 px-6 rounded-xl shadow-md shadow-[var(--accent)]/10 hover:shadow-[var(--accent)]/20 transition-all hover:-translate-y-0.5"
                    >
                        <Save className="w-4 h-4 mr-2" /> Save Preferences
                    </Button>
                </div>
            </div>

            {/* ⚡ QUICK SETTINGS (TOP ROW) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-[var(--accent)]/40 hover:shadow-lg hover:-translate-y-1 cursor-default">
                    <div className="h-12 w-12 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Timezone</p>
                        <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[200px]">{prefs.timezone.split('/').pop() || prefs.timezone}</p>
                    </div>
                </div>

                <div className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-[var(--accent)]/40 hover:shadow-lg hover:-translate-y-1 cursor-default">
                    <div className="h-12 w-12 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Date Format</p>
                        <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[200px]">{prefs.date_format}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                
                {/* 🌍 REGIONAL SETTINGS */}
                <section className="scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Regional Settings</h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">Control how dates and times are displayed across the workspace.</p>
                        </div>
                    </div>
                    
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--text-primary)]">Timezone</label>
                                <select 
                                    value={prefs.timezone} 
                                    onChange={(e) => setPrefs((current) => ({ ...current, timezone: e.target.value }))} 
                                    className="w-full rounded-xl border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                >
                                    {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[var(--text-primary)]">Date Format</label>
                                <select 
                                    value={prefs.date_format} 
                                    onChange={(e) => setPrefs((current) => ({ ...current, date_format: e.target.value }))} 
                                    className="w-full rounded-xl border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                >
                                    {DATE_FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ✉️ CAMPAIGN DEFAULTS */}
                <section className="scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Campaign Defaults</h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">Pre-fill details when creating new broadcasts.</p>
                        </div>
                    </div>
                    
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
                        <div className="max-w-xl space-y-2">
                            <label className="block text-sm font-bold text-[var(--text-primary)]">Default "From" Name</label>
                            <input
                                type="text"
                                value={prefs.default_from_name}
                                onChange={(e) => setPrefs((current) => ({ ...current, default_from_name: e.target.value }))}
                                placeholder="e.g. Acme Newsletter"
                                className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">This name will automatically populate the sender field in the campaign composer.</p>
                        </div>
                    </div>
                </section>

                {/* 📩 NOTIFICATIONS & ALERTS */}
                <section className="scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Email Alerts</h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">Tune operational and administrative notifications.</p>
                        </div>
                    </div>

                    {/* 🔔 Notifications Summary Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><Bell className="w-3 h-3" /> Enabled Alerts</span>
                            <span className="text-lg font-bold text-[var(--text-primary)]">{enabledCount} <span className="text-sm text-[var(--text-muted)] font-medium">/ 5</span></span>
                        </div>
                        <div className="flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> High Priority</span>
                            <span className={`text-lg font-bold ${notifs.bounce_alert ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{notifs.bounce_alert ? 'Active' : 'Off'}</span>
                        </div>
                        <div className="flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><BarChart2 className="w-3 h-3" /> Weekly Digest</span>
                            <span className="text-lg font-bold text-[var(--text-primary)]">{notifs.weekly_digest ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                    
                    {/* Main Alert Toggles List */}
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                        <div className="flex flex-col divide-y divide-[var(--border)]/60">
                            {NOTIFICATION_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const enabled = notifs[item.key];
                                return (
                                    <div 
                                        key={item.key} 
                                        onClick={() => toggleNotif(item.key)}
                                        className={`
                                            group flex items-center justify-between gap-6 p-6 transition-colors duration-200 cursor-pointer
                                            ${enabled ? 'bg-[var(--accent)]/[0.02] hover:bg-[var(--accent)]/[0.04]' : 'bg-transparent hover:bg-[var(--bg-hover)]'}
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors
                                                ${enabled ? 'bg-[var(--accent)] text-white border-transparent shadow-md shadow-[var(--accent)]/20' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]'}
                                            `}>
                                                <Icon className="h-4.5 w-4.5" />
                                            </div>
                                            <div>
                                                <p className={`text-[15px] font-bold transition-colors ${enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                    {item.label}
                                                </p>
                                                <p className="mt-1 text-[13px] text-[var(--text-muted)] leading-relaxed max-w-lg">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-300 ease-in-out ${enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]/80'}`}
                                            aria-pressed={enabled}
                                        >
                                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ⚙️ ADVANCED SETTINGS */}
                <section className="pt-4">
                    <InlineAlert
                        variant="info"
                        title="Notification Scope"
                        description="All notifications are sent securely to your primary account email. We recommend keeping urgent deliverability alerts (like Bounce Alerts) enabled to protect your domain reputation, even if you turn off summary emails."
                    />
                </section>
            </div>
        </div>
    );
}
