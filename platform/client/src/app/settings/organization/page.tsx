'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, MailCheck, ShieldCheck, CheckCircle2, XCircle, Info, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/utils/permissions';
import { Button, Input, PageHeader, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const COUNTRIES = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'India', 'Singapore', 'Netherlands', 'Brazil', 'Other',
];

const selectClassName = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]';

export default function OrganizationSettingsPage() {
    const { token, user, leaveWorkspace } = useAuth();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        company_name: '',
        business_address: '',
        business_city: '',
        business_state: '',
        business_zip: '',
        business_country: 'United States',
    });

    const isCanSpamComplete = Boolean(
        form.business_address && form.business_city && form.business_state && form.business_zip && form.business_country
    );

    const { completedCount, totalCount, progressPercentage } = useMemo(() => {
        const fields = Object.values(form);
        const completed = fields.filter(Boolean).length;
        const total = fields.length;
        return {
            completedCount: completed,
            totalCount: total,
            progressPercentage: Math.round((completed / total) * 100)
        };
    }, [form]);

    useEffect(() => {
        if (token) fetchOrganization();
    }, [token]);

    const fetchOrganization = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings/organization`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setForm({
                    company_name: data.company_name || '',
                    business_address: data.business_address || '',
                    business_city: data.business_city || '',
                    business_state: data.business_state || '',
                    business_zip: data.business_zip || '',
                    business_country: data.business_country || 'United States',
                });
            }
        } catch (fetchError) {
            console.error('Failed to fetch organization', fetchError);
            error('Failed to load organization details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch(`${API_BASE}/settings/organization`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                throw new Error('Failed to save organization.');
            }

            setIsEditing(false);
            success('Organization details saved.');
        } catch (saveError) {
            console.error('Error saving organization', saveError);
            error('Could not save organization details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-16 max-w-6xl mx-auto animate-in fade-in duration-300">
            
            {/* 🟢 HERO HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--border)]/60">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Trust & Compliance</h1>
                    <p className="text-base text-[var(--text-muted)] leading-relaxed">
                        Manage the legal entity and mailing addresses that power footer rendering and sender reputation.
                    </p>
                </div>
                {!isEditing && can(user, 'settings:manage') && (
                    <div className="flex-shrink-0">
                        <Button 
                            onClick={() => setIsEditing(true)} 
                            className="h-11 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                        >
                            Edit Details
                        </Button>
                    </div>
                )}
            </div>

            {/* 🟢 SEMANTIC INSIGHT CARDS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Compliance Status */}
                <div className={`relative overflow-hidden group flex flex-col gap-4 rounded-3xl border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isCanSpamComplete ? 'border-[var(--success)]/30 bg-gradient-to-br from-[var(--success)]/5 to-transparent' : 'border-[var(--danger)]/30 bg-gradient-to-br from-[var(--danger)]/5 to-transparent'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isCanSpamComplete ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Compliance Status</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCanSpamComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                        ) : (
                            <XCircle className="h-5 w-5 text-[var(--danger)]" />
                        )}
                        <span className={`text-xl font-bold tracking-tight ${isCanSpamComplete ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {isCanSpamComplete ? 'Ready' : 'Needs Attention'}
                        </span>
                    </div>
                </div>

                {/* Profile Completion */}
                <div className="relative overflow-hidden group flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:shadow-lg hover:border-[var(--accent)]/30 hover:-translate-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Profile Completion</h3>
                    </div>
                    <div>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{completedCount} <span className="text-sm text-[var(--text-muted)]">/ {totalCount}</span></span>
                            <span className="text-xs font-bold text-[var(--accent)]">{progressPercentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Preview Status */}
                <div className={`relative overflow-hidden group flex flex-col gap-4 rounded-3xl border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isCanSpamComplete ? 'border-[var(--info)]/30 bg-gradient-to-br from-[var(--info)]/5 to-transparent' : 'border-[var(--warning)]/30 bg-gradient-to-br from-[var(--warning)]/5 to-transparent'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isCanSpamComplete ? 'bg-[var(--info)]/10 text-[var(--info)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                            <MailCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Footer Generation</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold tracking-tight ${isCanSpamComplete ? 'text-[var(--info)]' : 'text-[var(--warning)]'}`}>
                            {isCanSpamComplete ? 'Live & Rendering' : 'Blocked'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 🚨 WARNING BANNER HERO */}
            {!isCanSpamComplete && !isEditing && (
                <div className="relative overflow-hidden rounded-3xl border border-[var(--danger)]/30 bg-gradient-to-r from-[var(--danger)]/10 to-[var(--danger)]/5 p-8 shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--danger)]" />
                    <div className="flex items-start md:items-center gap-5">
                        <div className="flex-shrink-0 p-3 bg-[var(--danger)]/20 rounded-2xl text-[var(--danger)]">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-[var(--danger)] mb-1">Physical Mailing Address Required</h2>
                            <p className="text-sm font-medium text-[var(--text-primary)] opacity-90 max-w-3xl leading-relaxed">
                                Commercial email regulations (like CAN-SPAM) strictly require a valid physical address in every marketing email footer. We cannot render your footer or allow campaigns to send until this is completed.
                            </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 md:mt-0">
                            <Button variant="danger" onClick={() => setIsEditing(true)}>Fix Now</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
                
                {/* 🧱 LEFT COLUMN: COMPANY DETAILS */}
                <div className="space-y-8">
                    <section className="scroll-mt-20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Company Details</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">Official registered entity and physical headquarters.</p>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
                            {isEditing ? (
                                <form onSubmit={handleSave} className="space-y-6 animate-in fade-in">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-[var(--text-primary)]">Registered Company Name</label>
                                        <input
                                            value={form.company_name}
                                            onChange={(e) => handleChange('company_name', e.target.value)}
                                            placeholder="Acme Corp"
                                            className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-[var(--text-primary)]">Street Address <span className="text-[var(--danger)]">*</span></label>
                                        <input
                                            value={form.business_address}
                                            onChange={(e) => handleChange('business_address', e.target.value)}
                                            placeholder="123 Main Street, Suite 400"
                                            required
                                            className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-[var(--text-primary)]">City <span className="text-[var(--danger)]">*</span></label>
                                            <input
                                                value={form.business_city}
                                                onChange={(e) => handleChange('business_city', e.target.value)}
                                                placeholder="San Francisco"
                                                required
                                                className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-[var(--text-primary)]">State / Region <span className="text-[var(--danger)]">*</span></label>
                                            <input
                                                value={form.business_state}
                                                onChange={(e) => handleChange('business_state', e.target.value)}
                                                placeholder="CA"
                                                required
                                                className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-[var(--text-primary)]">Postal Code <span className="text-[var(--danger)]">*</span></label>
                                            <input
                                                value={form.business_zip}
                                                onChange={(e) => handleChange('business_zip', e.target.value)}
                                                placeholder="94107"
                                                required
                                                className="w-full rounded-xl border border-transparent bg-[var(--bg-secondary)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-card)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 hover:bg-[var(--bg-hover)]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-[var(--text-primary)]">Country <span className="text-[var(--danger)]">*</span></label>
                                            <select
                                                value={form.business_country}
                                                onChange={(e) => handleChange('business_country', e.target.value)}
                                                className={selectClassName}
                                                required
                                            >
                                                {COUNTRIES.map((country) => (
                                                    <option key={country} value={country}>{country}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 pt-6 border-t border-[var(--border)]/60">
                                        <Button type="submit" isLoading={isSaving} className="h-11 px-8 rounded-xl shadow-md">
                                            Save Organization
                                        </Button>
                                        <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl" onClick={() => { setIsEditing(false); fetchOrganization(); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                                        
                                        {/* Field Item */}
                                        <div className={`p-4 rounded-2xl border ${!form.company_name ? 'border-[var(--warning)] bg-[var(--warning)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50'}`}>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Registered Company</p>
                                            <p className={`text-base font-bold truncate ${!form.company_name ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}`}>
                                                {form.company_name || 'Not set'}
                                            </p>
                                        </div>

                                        {/* Field Item */}
                                        <div className={`p-4 rounded-2xl border ${!form.business_address ? 'border-[var(--danger)] bg-[var(--danger)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50'}`}>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Street Address</p>
                                            <p className={`text-base font-bold truncate ${!form.business_address ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                                                {form.business_address || 'Missing required field'}
                                            </p>
                                        </div>

                                        {/* Field Item */}
                                        <div className={`p-4 rounded-2xl border ${!form.business_city || !form.business_state ? 'border-[var(--danger)] bg-[var(--danger)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50'}`}>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">City / Region</p>
                                            <p className={`text-base font-bold truncate ${!form.business_city || !form.business_state ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                                                {form.business_city || 'City'} {form.business_city && form.business_state ? ', ' : ''} {form.business_state || 'State'}
                                            </p>
                                        </div>

                                        {/* Field Item */}
                                        <div className={`p-4 rounded-2xl border ${!form.business_zip ? 'border-[var(--danger)] bg-[var(--danger)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50'}`}>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Postal Code</p>
                                            <p className={`text-base font-bold truncate ${!form.business_zip ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                                                {form.business_zip || 'Missing required field'}
                                            </p>
                                        </div>

                                        {/* Field Item */}
                                        <div className={`p-4 rounded-2xl border sm:col-span-2 ${!form.business_country ? 'border-[var(--danger)] bg-[var(--danger)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]/50'}`}>
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Compliance Country</p>
                                            <p className={`text-base font-bold truncate ${!form.business_country ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                                                {form.business_country || 'Missing required field'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 🔥 DANGER ZONE */}
                    <section className="pt-8">
                        <div className="rounded-3xl border-2 border-[var(--danger)] bg-gradient-to-br from-[var(--danger)]/10 to-[var(--bg-card)] p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-[var(--danger)]">
                                <AlertTriangle className="h-6 w-6" />
                                <h2 className="text-xl font-bold tracking-tight">Danger Zone</h2>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-primary)] mb-8 max-w-2xl opacity-90">
                                These actions are highly destructive and will affect your access to the workspace. Please proceed with extreme caution.
                            </p>

                            <div className="space-y-4">
                                {user?.role?.toUpperCase() === 'OWNER' ? (
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--danger)]/30 shadow-sm">
                                        <div>
                                            <p className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                <Trash2 className="w-4 h-4 text-[var(--danger)]" /> Delete Workspace
                                            </p>
                                            <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-md leading-relaxed">
                                                Permanently remove this workspace and all associated data. This action cannot be undone. You must be the last member to delete.
                                            </p>
                                        </div>
                                        <Button 
                                            variant="danger" 
                                            className="h-11 px-6 rounded-xl whitespace-nowrap"
                                            onClick={async () => {
                                                if (confirm("Are you ABSOLUTELY sure you want to delete this workspace? All data will be permanently wiped.")) {
                                                    try {
                                                        await leaveWorkspace();
                                                        success("Workspace deleted successfully.");
                                                    } catch (err: any) {
                                                        error(err.message);
                                                    }
                                                }
                                            }}
                                        >
                                            Delete Workspace
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--danger)]/30 shadow-sm">
                                        <div>
                                            <p className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                <LogOut className="w-4 h-4 text-[var(--warning)]" /> Leave Workspace
                                            </p>
                                            <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-md leading-relaxed">
                                                Remove your account from this workspace. You will lose access to all campaigns and contacts.
                                            </p>
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            className="h-11 px-6 rounded-xl whitespace-nowrap border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] hover:border-[var(--danger)]"
                                            onClick={async () => {
                                                if (confirm("Are you sure you want to leave this workspace?")) {
                                                    try {
                                                        await leaveWorkspace();
                                                        success("You have left the workspace.");
                                                    } catch (err: any) {
                                                        error(err.message);
                                                    }
                                                }
                                            }}
                                        >
                                            Leave Workspace
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* 📍 RIGHT COLUMN: INSIGHT PANEL */}
                <div className="space-y-6">
                    
                    {/* Legal Footer Preview Block */}
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)]/30 p-6 shadow-inner">
                        <div className="flex items-center gap-2 mb-4">
                            <MailCheck className="h-5 w-5 text-[var(--text-muted)]" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">Footer Rendering</h3>
                        </div>
                        
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-center shadow-sm">
                            {isCanSpamComplete ? (
                                <div className="animate-in fade-in">
                                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                                        You are receiving this email because you opted in via our website.
                                    </p>
                                    <div className="mt-5 mb-4 text-[12px] leading-relaxed text-[var(--text-muted)] space-y-1">
                                        <p className="font-bold text-[var(--text-primary)] text-[13px]">{form.company_name || 'Your Company Name'}</p>
                                        <p>{form.business_address}</p>
                                        <p>{form.business_city}, {form.business_state} {form.business_zip}</p>
                                        <p>{form.business_country}</p>
                                    </div>
                                    <p className="mt-4 inline-block text-[11px] font-bold text-[var(--accent)] underline hover:opacity-80 transition-opacity cursor-pointer">
                                        Unsubscribe from these emails
                                    </p>
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center justify-center text-center opacity-70">
                                    <XCircle className="w-8 h-8 text-[var(--danger)] mb-3 opacity-50" />
                                    <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Rendering Blocked</p>
                                    <p className="text-[11px] text-[var(--text-muted)] max-w-[200px] leading-relaxed">
                                        Fill out your required physical address completely to unlock the footer preview.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Block */}
                    <div className="rounded-3xl border border-[var(--info)]/20 bg-gradient-to-b from-[var(--info)]/10 to-transparent p-6">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Why this matters</h3>
                                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-4">
                                    Anti-spam regulations globally (like CAN-SPAM) require commercial email to prominently identify the sender's physical mailing address. This is a non-negotiable requirement for Inbox deliverability.
                                </p>
                                <a
                                    href="https://www.FTC.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-[12px] font-bold text-[var(--info)] hover:text-[var(--accent)] transition-colors group"
                                >
                                    Read the FTC CAN-SPAM Guide
                                    <svg className="ml-1 w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
