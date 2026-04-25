'use client';

import { useState } from 'react';
import { AlertTriangle, BarChart2, Bell, CreditCard, Mail, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, InlineAlert, PageHeader, SectionCard, StatCard, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Prefs = {
    campaign_completed: boolean;
    bounce_alert: boolean;
    weekly_digest: boolean;
    billing_warning: boolean;
    team_joined: boolean;
};

const NOTIFICATION_ITEMS: { key: keyof Prefs; icon: any; label: string; description: string }[] = [
    { key: 'campaign_completed', icon: Megaphone, label: 'Campaign Completed', description: 'Get notified when a campaign finishes sending with a summary of results.' },
    { key: 'bounce_alert', icon: AlertTriangle, label: 'Bounce Alert', description: 'Immediate alert when your bounce rate triggers the circuit breaker.' },
    { key: 'weekly_digest', icon: BarChart2, label: 'Weekly Digest', description: 'A weekly summary of sends, opens, clicks, and deliverability health.' },
    { key: 'billing_warning', icon: CreditCard, label: 'Billing & Usage Warnings', description: 'Alerts when you approach plan limits or a payment fails.' },
    { key: 'team_joined', icon: Mail, label: 'Team Activity', description: 'Notify when someone accepts a team invitation or requests access.' },
];

export default function NotificationsPage() {
    const { token } = useAuth();
    const { success, error } = useToast();
    const [prefs, setPrefs] = useState<Prefs>({
        campaign_completed: true,
        bounce_alert: true,
        weekly_digest: false,
        billing_warning: true,
        team_joined: false,
    });
    const [saving, setSaving] = useState(false);

    const toggle = (key: keyof Prefs) => setPrefs((current) => ({ ...current, [key]: !current[key] }));

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/settings/notifications`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            });
            if (!res.ok) throw new Error('Failed to save notification preferences.');
            success('Notification preferences saved.');
        } catch (saveError) {
            console.error(saveError);
            error('Could not save notification preferences.');
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = Object.values(prefs).filter(Boolean).length;

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Notifications"
                subtitle="Control which alerts reach your account email so the signal stays useful and high-priority events never get buried."
                action={<Button onClick={save} isLoading={saving}>Save Preferences</Button>}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Enabled Alerts" value={enabledCount.toString()} icon={<Bell className="h-5 w-5" />} />
                <StatCard label="High Priority" value={prefs.bounce_alert ? 'On' : 'Off'} icon={<AlertTriangle className="h-5 w-5" />} />
                <StatCard label="Digest" value={prefs.weekly_digest ? 'Enabled' : 'Off'} icon={<BarChart2 className="h-5 w-5" />} />
            </div>

            <InlineAlert
                variant="info"
                title="Notification scope"
                description="All notifications are sent to your primary account email. Keep urgent deliverability alerts enabled even if you reduce the rest."
            />

            <SectionCard title="Email Alerts" description="Tune operational and administrative notifications to match how your team actually works.">
                <div className="space-y-3">
                    {NOTIFICATION_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const enabled = prefs[item.key];
                        return (
                            <div key={item.key} className={`flex items-center justify-between gap-4 rounded-[var(--radius)] border p-4 transition ${enabled ? 'border-[var(--accent)]/25 bg-[var(--info-bg)]/30' : 'border-[var(--border)] bg-[var(--bg-primary)]'}`}>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--accent)]">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">{item.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggle(item.key)}
                                    className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-input)]'}`}
                                    aria-pressed={enabled}
                                >
                                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>
        </div>
    );
}
