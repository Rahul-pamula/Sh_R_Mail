'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { OnboardingShell } from '@/components/onboarding';
import { Button, InlineAlert, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function WorkspaceOnboarding() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        workspaceName: '',
        role: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [inviteData, setInviteData] = useState<any>(null);
    const { user } = useAuth();

    const roles = ['Founder', 'Developer', 'Marketer', 'Other'];

    // Fetch current status to pre-fill
    useEffect(() => {
        async function fetchStatus() {
            try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.current_data) {
                        setFormData({
                            workspaceName: data.current_data.pending_invite?.workspace_name || data.current_data.workspace_name || '',
                            role: data.current_data.pending_invite?.role || data.current_data.user_role || '',
                        });
                        if (data.current_data.pending_invite) {
                            setInviteData(data.current_data.pending_invite);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch onboarding status:", err);
            } finally {
                setFetching(false);
            }
        }
        fetchStatus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!inviteData) {
            // Validation for OWNER flow
            if (!formData.workspaceName.trim()) {
                setErrors({ workspaceName: 'Workspace name is required' });
                return;
            }
            if (!formData.role) {
                setErrors({ role: 'Please select your role' });
                return;
            }
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('auth_token');
            
            if (inviteData) {
                // INVITED USER FLOW: Accept Invite
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/invites/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        token: inviteData.token
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to join workspace');
                }

                const data = await response.json();
                if (data.new_token) {
                    localStorage.setItem('auth_token', data.new_token);
                }
                
                // Navigate to dashboard directly for invited users
                router.push('/dashboard');
            } else {
                // OWNER FLOW: Create Workspace
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/workspace`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        workspace_name: formData.workspaceName,
                        user_role: formData.role,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to save workspace info');
                }

                router.push('/onboarding/use-case');
            }
        } catch (error: any) {
            console.error('Error in onboarding:', error);
            setErrors({ general: error.message || 'Failed to save. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <OnboardingShell
            step={1}
            totalSteps={inviteData ? 1 : 4}
            icon={<Building2 className="h-6 w-6" />}
            title={inviteData ? "Join your workspace" : "Set up your workspace"}
            description={inviteData 
                ? "You've been invited to join an existing workspace" 
                : "We’ll use this to shape your initial defaults and make the rest of setup much smoother."}
        >
            {fetching ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
                    <p className="text-sm text-[var(--text-muted)]">Loading your workspace...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                    <InlineAlert
                        variant="danger"
                        title={inviteData ? "Couldn’t join workspace" : "Couldn’t save workspace details"}
                        description={errors.general}
                    />
                )}

                <div className="grid gap-5">
                    <Input
                        id="workspaceName"
                        label="Workspace or company name"
                        value={formData.workspaceName}
                        onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                        placeholder="Acme Corporation"
                        disabled={loading || !!inviteData}
                        error={errors.workspaceName}
                        className="border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-80"
                    />

                    <div className="w-full">
                        <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                            Your role
                        </label>
                        {inviteData ? (
                            <div className="flex h-10 w-full items-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] opacity-80">
                                {formData.role}
                            </div>
                        ) : (
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                disabled={loading}
                                className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${errors.role ? 'border-[var(--danger)]' : 'border-[var(--border)]'} bg-[var(--bg-primary)] text-[var(--text-primary)]`}
                            >
                                <option value="">Select your role</option>
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        )}
                        {errors.role && <p className="mt-1.5 text-sm text-[var(--danger)]">{errors.role}</p>}
                    </div>

                    {inviteData && inviteData.inviter_id && (
                        <p className="text-xs text-[var(--text-muted)]">
                            Invited by: <span className="text-[var(--text-primary)]">{inviteData.inviter_id}</span>
                        </p>
                    )}
                </div>

                <Button type="submit" size="lg" isLoading={loading} className="w-full">
                    {loading ? (inviteData ? 'Joining...' : 'Saving...') : (inviteData ? 'Accept & Join' : 'Continue')}
                    {!loading && <ArrowRight className="h-5 w-5 ml-2" />}
                </Button>
                </form>
            )}
        </OnboardingShell>
    );
}
