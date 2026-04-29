'use client';

import Link from 'next/link';
import { Eye, EyeOff, Lock, Shield, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { Button, InlineAlert, KeyValueList, PageHeader, SectionCard, StatCard, useToast } from '@/components/ui';
import { Input } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AccountSecurityPage() {
    const { token, user } = useAuth();
    const { success, error } = useToast();

    const [current, setCurrent] = useState('');
    const [nextPassword, setNextPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const handleChangePassword = async () => {
        setFormError('');
        setFormSuccess('');

        if (!current || !nextPassword || !confirm) {
            setFormError('All password fields are required.');
            return;
        }
        if (nextPassword.length < 8) {
            setFormError('New password must be at least 8 characters.');
            return;
        }
        if (nextPassword !== confirm) {
            setFormError('New passwords do not match.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: current,
                    new_password: nextPassword,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update password.');
            }

            setCurrent('');
            setNextPassword('');
            setConfirm('');
            setFormSuccess('Password updated successfully.');
            success('Password updated successfully.');
        } catch (changeError: any) {
            setFormError(changeError.message || 'Could not update password.');
            error(changeError.message || 'Could not update password.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Account Security"
                subtitle="Manage password hygiene and future account-protection controls at the identity layer, separate from workspace operations."
                action={
                    <Link href="/account">
                        <Button variant="secondary">Back to Account</Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Account Email" value={user?.email || 'Unknown'} icon={<Lock className="h-5 w-5" />} />
                <StatCard label="Password" value="Managed" icon={<Shield className="h-5 w-5" />} />
                <StatCard label="Two-Factor Auth" value="Coming Soon" icon={<Smartphone className="h-5 w-5" />} />
            </div>

            <SectionCard
                title="Identity Access"
                description="These controls affect how you sign in to Sh_R_Mail itself, regardless of which workspace you enter."
            >
                <KeyValueList
                    columns={2}
                    items={[
                        { label: 'Primary Email', value: user?.email || 'Not available', helper: 'Used for sign-in, recovery, and invitations.' },
                        { label: 'Security Scope', value: 'Account-wide', helper: 'Password and future MFA settings apply to your identity, not one workspace.' },
                    ]}
                />
            </SectionCard>

            <SectionCard
                title="Change Password"
                description="Update your password here. Forgot-password and recovery emails remain public identity flows outside workspace settings."
            >
                <div className="max-w-xl space-y-4">
                    <div className="relative">
                        <Input
                            type={showCurrent ? 'text' : 'password'}
                            label="Current Password"
                            value={current}
                            onChange={(event) => setCurrent(event.target.value)}
                            className="pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent((value) => !value)}
                            className="absolute right-3 top-[37px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="relative">
                        <Input
                            type={showNext ? 'text' : 'password'}
                            label="New Password"
                            helperText="Minimum 8 characters."
                            value={nextPassword}
                            onChange={(event) => setNextPassword(event.target.value)}
                            className="pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNext((value) => !value)}
                            className="absolute right-3 top-[37px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                            {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <Input
                        type="password"
                        label="Confirm New Password"
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                    />

                    {formError && <InlineAlert variant="danger" title="Password update failed" description={formError} />}
                    {formSuccess && <InlineAlert variant="success" title="Password updated" description={formSuccess} />}

                    <Button onClick={handleChangePassword} isLoading={isSaving}>
                        Update Password
                    </Button>
                </div>
            </SectionCard>

            <SectionCard
                tone="subtle"
                title="Two-Factor Authentication"
                description="Authenticator-app protection belongs here as an account-level control. The product scaffolding can point here even before the full TOTP flow ships."
            >
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-muted)]">
                    <Smartphone className="h-4 w-4" />
                    Coming Soon
                </div>
            </SectionCard>
        </div>
    );
}
