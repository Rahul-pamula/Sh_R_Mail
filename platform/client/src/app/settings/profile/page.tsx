'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Mail, Shield, Sliders, User } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button, KeyValueList, PageHeader, SectionCard, StatCard, useToast } from '@/components/ui';
import { Input } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Default)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT+0)' },
    { value: 'Europe/Paris', label: 'Central Europe (CET)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

const selectClassName =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';

export default function ProfileSettingsPage() {
    const { token, updateUserContext } = useAuth();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (token) fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/settings/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFullName(data.full_name || '');
                setTimezone(data.timezone || 'UTC');
                setEmail(data.email || '');
            }
        } catch (fetchError) {
            console.error('Failed to fetch profile', fetchError);
            error('Failed to load your personal preferences.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/settings/profile`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ full_name: fullName, timezone }),
            });
            if (!response.ok) {
                throw new Error('Failed to save profile.');
            }

            const data = await response.json();
            if (updateUserContext && data.data) {
                updateUserContext({ fullName: data.data.full_name });
            }
            setIsEditing(false);
            success('Personal preferences updated.');
        } catch (saveError) {
            console.error('Error saving profile', saveError);
            error('Could not save your personal preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 text-sm text-[var(--text-muted)]">Loading personal preferences...</div>;
    }

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Personal Preferences"
                subtitle="This page now focuses on lightweight personal defaults. Account identity, workspace memberships, invitations, and sign-in security live in Account Center."
                action={
                    <Link href="/account">
                        <Button variant="secondary">Open Account Center</Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Sign-In Email" value={email ? 'Available' : 'Missing'} icon={<Mail className="h-5 w-5" />} />
                <StatCard label="Display Name" value={fullName ? 'Configured' : 'Optional'} icon={<User className="h-5 w-5" />} />
                <StatCard label="Timezone" value={timezone.split('/').pop() || timezone} icon={<Sliders className="h-5 w-5" />} />
            </div>

            <SectionCard
                title="Personal Defaults"
                description="Use this area for your name and timezone. Password, MFA, workspace switching, and invitations belong in the account layer."
                action={!isEditing ? <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit</Button> : null}
            >
                {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Display Name"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                placeholder="Optional display name"
                                autoFocus
                            />
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">Timezone</label>
                                <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={selectClassName}>
                                    {TIMEZONES.map((zone) => (
                                        <option key={zone.value} value={zone.value}>{zone.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <Button type="submit" isLoading={isSaving}>Save Changes</Button>
                            <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); fetchProfile(); }}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <KeyValueList
                        columns={2}
                        items={[
                            { label: 'Sign-In Email', value: email || 'Not set', helper: 'Your account email is managed at the identity layer.' },
                            { label: 'Display Name', value: fullName || 'Not set', helper: 'Optional internal display name for collaboration surfaces.' },
                            { label: 'Default Timezone', value: timezone, helper: 'Used in scheduling and account-level presentation defaults.' },
                            { label: 'Security Controls', value: 'Managed in Account Center', helper: 'Password change, recovery, and future MFA live under account security.' },
                        ]}
                    />
                )}
            </SectionCard>

            <SectionCard
                tone="subtle"
                title="Account Layer"
                description="Identity and membership actions now live in one place so present and future users learn a consistent navigation model."
            >
                <div className="flex flex-wrap gap-3">
                    <Link href="/account">
                        <Button variant="secondary">
                            <User className="h-4 w-4" />
                            Account Center
                        </Button>
                    </Link>
                    <Link href="/account/security">
                        <Button variant="secondary">
                            <Shield className="h-4 w-4" />
                            Account Security
                        </Button>
                    </Link>
                </div>
            </SectionCard>
        </div>
    );
}
