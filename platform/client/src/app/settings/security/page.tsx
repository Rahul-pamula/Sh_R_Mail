'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, InlineAlert, Input, PageHeader, SectionCard, StatCard, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function SecurityPage() {
    const { token } = useAuth();
    const { success, error } = useToast();

    const [current, setCurrent] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    const changePassword = async () => {
        setPwError('');
        if (!current || !newPw || !confirm) {
            setPwError('All fields are required.');
            return;
        }
        if (newPw.length < 8) {
            setPwError('New password must be at least 8 characters.');
            return;
        }
        if (newPw !== confirm) {
            setPwError('New passwords do not match.');
            return;
        }
        setPwSaving(true);
        try {
            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: current, new_password: newPw }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to update password.');
            }
            setPwSuccess(true);
            success('Password updated successfully.');
            setCurrent('');
            setNewPw('');
            setConfirm('');
            setTimeout(() => setPwSuccess(false), 3000);
        } catch (changeError: any) {
            setPwError(changeError.message || 'Something went wrong.');
            error(changeError.message || 'Could not update password.');
        } finally {
            setPwSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Security"
                subtitle="Manage password hygiene and prepare for stronger account protection as more security features come online."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="Password State" value="Managed" icon={<Lock className="h-5 w-5" />} />
                <StatCard label="Two-Factor Auth" value="Coming Soon" icon={<Smartphone className="h-5 w-5" />} />
                <StatCard label="Security Level" value="Standard" icon={<Shield className="h-5 w-5" />} />
            </div>

            <SectionCard title="Change Password" description="Update your password regularly if the account is shared across devices or if you suspect credentials may have leaked.">
                <div className="max-w-xl space-y-4">
                    <div className="relative">
                        <Input type={showCurrent ? 'text' : 'password'} label="Current Password" value={current} onChange={(e) => setCurrent(e.target.value)} className="pr-11" />
                        <button onClick={() => setShowCurrent((value) => !value)} className="absolute right-3 top-[37px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="relative">
                        <Input type={showNew ? 'text' : 'password'} label="New Password" helperText="Minimum 8 characters." value={newPw} onChange={(e) => setNewPw(e.target.value)} className="pr-11" />
                        <button onClick={() => setShowNew((value) => !value)} className="absolute right-3 top-[37px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <Input type="password" label="Confirm New Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

                    {pwError && <InlineAlert variant="danger" title="Password update failed" description={pwError} />}
                    {pwSuccess && <InlineAlert variant="success" title="Password updated" description="Your account password was changed successfully." />}

                    <Button onClick={changePassword} isLoading={pwSaving}>Update Password</Button>
                </div>
            </SectionCard>

            <SectionCard tone="subtle" title="Two-Factor Authentication" description="Additional account protection with an authenticator app is planned but not yet enabled in the product.">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-muted)]">
                    <Smartphone className="h-4 w-4" />
                    Coming Soon
                </div>
            </SectionCard>
        </div>
    );
}
