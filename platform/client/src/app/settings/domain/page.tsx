"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Copy, Plus, Activity, RefreshCw, Globe, CheckCircle2, ShieldAlert, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui';

const API_BASE = 'http://127.0.0.1:8000';

// Theme constants — all values reference CSS variables for light/dark support
const colors = {
    bg: 'var(--bg-primary)',
    card: 'var(--bg-card)',
    border: 'var(--border)',
    text: 'var(--text-primary)',
    textSecondary: 'var(--text-muted)',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.1)',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.1)',
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--bg-input)',
    border: `1px solid var(--border)`,
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
};

const btnPrimary = {
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
};

const codeBlockStyle = {
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: 'var(--bg-hover)',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid var(--border)`,
    color: 'var(--text-primary)',
    wordBreak: 'break-all' as any,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
};

export default function DomainSettingsPage() {
    const { token } = useAuth();
    const { success, error, info } = useToast();
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<any>(null);

    useEffect(() => {
        if (token) fetchDomains();
    }, [token]);

    const fetchDomains = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/domains/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDomains(data.data || []);
            }
        } catch (e) {
            error('Failed to load domains');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain.includes('.')) {
            error("Please enter a valid domain (e.g., example.com)");
            return;
        }
        setAdding(true);
        try {
            const res = await fetch(`${API_BASE}/domains/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ domain_name: newDomain.toLowerCase() }),
            });
            const data = await res.json();
            if (res.ok) {
                success('Domain registered with AWS!');
                setShowAddModal(false);
                setNewDomain('');
                fetchDomains();
                setSelectedDomain(data.data);
            } else {
                error(data.detail || 'Failed to add domain');
            }
        } catch (e) {
            error('Network error');
        } finally {
            setAdding(false);
        }
    };

    const handleVerify = async (domain: any) => {
        info('Checking DNS records globally...');
        try {
            const res = await fetch(`${API_BASE}/domains/${domain.id}/verify`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                if (data.verification_status === 'verified') {
                    success('Domain verified successfully!');
                } else if (data.verification_status === 'failed') {
                    error('AWS rejected the records. Check your DNS.');
                } else {
                    error('Records not found yet. DNS propagation takes time.');
                }
                fetchDomains();
                if (selectedDomain?.id === domain.id) {
                    setSelectedDomain({ ...selectedDomain, status: data.verification_status });
                }
            } else {
                error(data.detail || 'Verification error');
            }
        } catch (e) {
            error('Network error during verification');
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Are you sure you want to remove this domain? You will not be able to send emails from it.')) return;
        try {
            await fetch(`${API_BASE}/domains/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            success('Domain removed');
            if (selectedDomain?.id === id) setSelectedDomain(null);
            fetchDomains();
        } catch (e) {
            error('Failed to remove domain');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        success('Copied to clipboard');
    };

    return (
        <div style={{ maxWidth: '1000px', paddingBottom: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, textDecoration: 'none', marginBottom: '16px', fontSize: '14px', transition: 'color 0.2s', fontWeight: 500 }}>
                        <ArrowLeft size={16} /> Back to Settings
                    </Link>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, color: colors.text, margin: '0 0 8px' }}>Sending Domains</h1>
                    <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                        Verify your domains to send fully branded emails and reach the inbox.
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} style={btnPrimary}>
                    <Plus size={16} /> Add Domain
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>Loading domains...</div>
            ) : domains.length === 0 ? (
                <div style={{
                    backgroundColor: colors.card, border: `1px solid ${colors.border}`,
                    borderRadius: '12px', padding: '60px 20px', textAlign: 'center'
                }}>
                    <Globe size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', color: colors.text, margin: '0 0 8px' }}>No domains connected</h3>
                    <p style={{ color: colors.textSecondary, margin: '0 auto 24px', maxWidth: '400px', fontSize: '14px' }}>
                        Add your custom domain (like brand.com) to start sending authenticated emails that bypass spam filters.
                    </p>
                    <button onClick={() => setShowAddModal(true)} style={{ ...btnPrimary, margin: '0 auto' }}>
                        <Plus size={16} /> Connect a Domain
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
                    {/* Domain List Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {domains.map((d: any) => (
                            <div
                                key={d.id}
                                onClick={() => setSelectedDomain(d)}
                                style={{
                                    padding: '16px', borderRadius: '12px', cursor: 'pointer',
                                    backgroundColor: selectedDomain?.id === d.id ? 'rgba(59, 130, 246, 0.1)' : colors.card,
                                    border: `1px solid ${selectedDomain?.id === d.id ? colors.primary : colors.border}`,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong style={{ color: colors.text, fontSize: '15px' }}>{d.domain_name}</strong>
                                    {d.status === 'verified' ? (
                                        <CheckCircle2 size={16} color={colors.success} />
                                    ) : d.status === 'failed' ? (
                                        <ShieldAlert size={16} color={colors.danger} />
                                    ) : (
                                        <Activity size={16} color={colors.warning} />
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                                    backgroundColor: d.status === 'verified' ? colors.successBg : d.status === 'failed' ? colors.dangerBg : colors.warningBg,
                                    color: d.status === 'verified' ? colors.success : d.status === 'failed' ? colors.danger : colors.warning
                                }}>
                                    {d.status === 'pending' ? 'Pending Validation' : d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Selected Domain DNS Instructions */}
                    {selectedDomain && (
                        <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', color: colors.text, margin: '0 0 8px' }}>{selectedDomain.domain_name}</h2>
                                    <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 10px' }}>
                                        Add these records to your domain's DNS provider (Namecheap, GoDaddy, etc.)
                                    </p>
                                    <a href="/settings/domain/help" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: colors.primary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                        Need help? View step-by-step guides for Namecheap, GoDaddy, and more &rarr;
                                    </a>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedDomain.status !== 'verified' && (
                                        <button onClick={() => handleVerify(selectedDomain)} style={{ ...btnPrimary, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                            <RefreshCw size={14} /> Check Status
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedDomain.status === 'verified' ? (
                                <div style={{ padding: '24px', backgroundColor: colors.successBg, border: `1px solid rgba(16, 185, 129, 0.3)`, borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'start' }}>
                                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '50%', color: colors.success }}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ color: colors.success, margin: '0 0 4px', fontSize: '16px' }}>Domain Authenticated</h4>
                                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                                            Your domain is fully authenticated with DKIM and SPF. You are ready to start sending branded emails that reach the inbox.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '12px 16px', backgroundColor: colors.warningBg, border: `1px solid rgba(245,158,11,0.3)`, borderRadius: '8px', marginBottom: '24px' }}>
                                    <h4 style={{ color: colors.warning, margin: '0 0 4px', fontSize: '14px' }}>Verification Pending</h4>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
                                        It can take 10-45 minutes for DNS changes to propagate globally depending on your provider.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {selectedDomain.status !== 'verified' && (
                                    <>
                                        {/* DKIM Records */}
                                        <section>
                                            <h3 style={{ fontSize: '16px', color: colors.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                1. DKIM Records <span style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Required</span>
                                            </h3>
                                            <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>
                                                A digital signature proving the email genuinely came from you. Add 3 CNAME records.
                                            </p>

                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Type</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Host / Name</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Value / Target</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(selectedDomain.dkim_tokens || []).map((token: string, i: number) => (
                                                        <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                                                            <td style={{ padding: '12px 4px', color: colors.text }}>CNAME</td>
                                                            <td style={{ padding: '12px 4px', width: '35%' }}>
                                                                <div style={codeBlockStyle}>
                                                                    <span>{token}._domainkey</span>
                                                                    <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(`${token}._domainkey`)} />
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 4px' }}>
                                                                <div style={codeBlockStyle}>
                                                                    <span>{token}.dkim.amazonses.com</span>
                                                                    <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(`${token}.dkim.amazonses.com`)} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </section>

                                        {/* SPF Record */}
                                        <section>
                                            <h3 style={{ fontSize: '16px', color: colors.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                2. SPF Record <span style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Required</span>
                                            </h3>
                                            <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>
                                                Tells inboxes that Amazon SES is explicitly authorized to send emails on your behalf.
                                            </p>

                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Type</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Host / Name</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Value / Target</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '12px 4px', color: colors.text }}>TXT</td>
                                                        <td style={{ padding: '12px 4px', width: '35%' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>@</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard("@")} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 4px' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>v=spf1 include:amazonses.com ~all</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard("v=spf1 include:amazonses.com ~all")} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </section>

                                        {/* Custom MAIL FROM Records */}
                                        <section>
                                            <h3 style={{ fontSize: '16px', color: colors.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                3. Custom Return-Path <span style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Recommended</span>
                                            </h3>
                                            <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>
                                                Removes the "via amazonses.com" tag in Gmail (Provides DMARC Alignment).
                                            </p>

                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Type</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Host / Name</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Value / Target</th>
                                                        <th style={{ padding: '8px 4px', color: colors.textSecondary, fontWeight: 500 }}>Priority</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                                                        <td style={{ padding: '12px 4px', color: colors.text }}>MX</td>
                                                        <td style={{ padding: '12px 4px', width: '25%' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>bounces</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(`bounces`)} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 4px' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>feedback-smtp.us-east-1.amazonses.com</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(`feedback-smtp.us-east-1.amazonses.com`)} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 4px', color: colors.text }}>10</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '12px 4px', color: colors.text }}>TXT</td>
                                                        <td style={{ padding: '12px 4px', width: '25%' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>bounces</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard(`bounces`)} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 4px' }}>
                                                            <div style={codeBlockStyle}>
                                                                <span>v=spf1 include:amazonses.com ~all</span>
                                                                <Copy size={14} color={colors.textSecondary} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copyToClipboard("v=spf1 include:amazonses.com ~all")} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 4px', color: colors.text }}>-</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </section>
                                    </>
                                )}

                                {/* Danger Zone: Remove Domain */}
                                <section style={{ borderTop: `1px solid rgba(239, 68, 68, 0.2)`, paddingTop: '24px', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ fontSize: '16px', color: colors.danger, margin: '0 0 4px' }}>Danger Zone</h3>
                                            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Remove this domain. You will no longer be able to send emails from it.</p>
                                        </div>
                                        <button onClick={() => handleRemove(selectedDomain.id)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: colors.danger, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500 }}>
                                            Remove Domain
                                        </button>
                                    </div>
                                </section>

                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Domain Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '100%', maxWidth: '400px', border: `1px solid ${colors.border}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ color: colors.text, margin: 0, fontSize: '18px' }}>Connect Domain</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddDomain}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '8px' }}>
                                    Domain Name (e.g., brand.com)
                                </label>
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="example.com"
                                    style={inputStyle}
                                    autoFocus
                                />
                            </div>
                            <button type="submit" disabled={adding} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>
                                {adding ? <RefreshCw size={16} className="animate-spin" /> : 'Generate Verification Records'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
