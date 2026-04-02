'use client';

import { useState, useEffect } from 'react';
import { Building2, ArrowLeft, Save, Loader2, AlertTriangle, ShieldCheck, MailCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const COUNTRIES = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'India', 'Singapore', 'Netherlands', 'Brazil', 'Other',
];

export default function OrganizationSettingsPage() {
    const { token } = useAuth();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        company_name: '',
        business_address: '',
        business_city: '',
        business_state: '',
        business_zip: '',
        business_country: 'United States',
    });

    const isCanSpamComplete = form.business_address && form.business_city && form.business_state && form.business_zip && form.business_country;

    useEffect(() => {
        if (token) fetchOrganization();
    }, [token]);

    const fetchOrganization = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings/organization`, {
                headers: { Authorization: `Bearer ${token}` }
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
        } catch (error) {
            console.error('Failed to fetch organization', error);
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            
            if (res.ok) {
                // optional success toast
            } else {
                alert('Failed to save organization.');
            }
        } catch (error) {
            console.error('Error saving organization', error);
            alert('An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fadeIn">
            {/* Header */}
            <div className="mb-8 mt-4">
                <div className="mb-4">
                    <a href="/settings" className="inline-flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                        <ArrowLeft size={16} className="mr-2" /> Back to Settings
                    </a>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                    Organization Details
                </h1>
                <p className="text-[var(--text-muted)] text-base">
                    Company name and physical mailing address (CAN-SPAM required).
                </p>
            </div>

            {/* CAN-SPAM Warning Banner */}
            {!isCanSpamComplete && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-500">Physical Address Required</h3>
                        <p className="text-sm text-amber-500/80 mt-1">
                            Anti-spam laws (like CAN-SPAM) require a valid physical mailing address in every commercial email you send. Please complete your address below.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                    
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[var(--accent)]" /> 
                            Company Details
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Company Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Company/Organization Name</label>
                                <input 
                                    type="text" 
                                    value={form.company_name}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                    placeholder="Acme Corp"
                                />
                            </div>

                            <hr className="border-[var(--border)]" />

                            {/* Address Row 1 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Street Address <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={form.business_address}
                                    onChange={(e) => handleChange('business_address', e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                    placeholder="123 Main Street, Suite 400"
                                    required
                                />
                            </div>

                            {/* Address Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">City <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={form.business_city}
                                        onChange={(e) => handleChange('business_city', e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                        placeholder="San Francisco"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">State/Province <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={form.business_state}
                                        onChange={(e) => handleChange('business_state', e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                        placeholder="CA"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Address Row 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">ZIP/Postal Code <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={form.business_zip}
                                        onChange={(e) => handleChange('business_zip', e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                        placeholder="94107"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Country <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={form.business_country}
                                        onChange={(e) => handleChange('business_country', e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none"
                                        required
                                    >
                                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
                                    <Save className="w-4 h-4 mr-2" /> Save Organization
                                </Button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* Right Column: Preview & Info */}
                <div className="space-y-6">
                    
                    {/* Live Preview Card */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <MailCheck className="w-4 h-4 text-emerald-500" /> Email Footer Preview
                        </h3>
                        
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center">
                            {isCanSpamComplete ? (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        You are receiving this email because you opted in via our website.
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-4 mb-2">
                                        <strong>{form.company_name || 'Your Company Name'}</strong><br />
                                        {form.business_address}<br />
                                        {form.business_city}, {form.business_state} {form.business_zip}<br />
                                        {form.business_country}
                                    </p>
                                    <p className="text-[10px] text-blue-500 underline cursor-pointer">Unsubscribe from these emails</p>
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic py-2">
                                    Fill out your physical address completely to see the footer preview here.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Legal Info Card */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[var(--radius-lg)] p-5">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Why do we need this?
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                            Anti-spam regulations globally mandate that marketing emails identify the sender's physical address. 
                            This builds trust with recipients and ensures compliance.
                        </p>
                        <a href="https://www.ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">
                            Read FTC CAN-SPAM Guide &rarr;
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
