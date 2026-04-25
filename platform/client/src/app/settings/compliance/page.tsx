'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Download, Trash2, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Badge, Button, ConfirmModal, InlineAlert, Input, PageHeader, SectionCard, StatCard, useToast } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function ComplianceSettings() {
    const { token } = useAuth();
    const { success, error, warning } = useToast();
    const [eraseEmail, setEraseEmail] = useState('');
    const [erasing, setErasing] = useState(false);
    const [erased, setErased] = useState(false);
    const [eraseError, setEraseError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [confirmEraseOpen, setConfirmEraseOpen] = useState(false);

    const handleGdprErase = async () => {
        if (!eraseEmail.trim()) return;

        setErasing(true);
        setEraseError('');
        try {
            // Find contact by email first
            const searchRes = await fetch(`${API_BASE}/contacts?search=${encodeURIComponent(eraseEmail)}&limit=1`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const searchData = await searchRes.json();
            const contacts = searchData.contacts || searchData.data || [];
            if (!contacts.length) {
                setEraseError('No contact found with that email address.');
                return;
            }
            const contactId = contacts[0].id;
            const eraseRes = await fetch(`${API_BASE}/settings/gdpr/erase-contact/${contactId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!eraseRes.ok) throw new Error((await eraseRes.json()).detail || 'Erase failed');
            setErased(true);
            success(`PII erased for ${eraseEmail}.`);
            setEraseEmail('');
            setConfirmEraseOpen(false);
            setTimeout(() => setErased(false), 5000);
        } catch (e: any) {
            setEraseError(e.message);
            error(e.message);
        } finally {
            setErasing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch(`${API_BASE}/contacts/export/async`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to start export');
            const data = await res.json();
            if (!data.job_id) throw new Error('No job ID returned');
            
            const poll = setInterval(async () => {
                try {
                    const jr = await fetch(`${API_BASE}/contacts/jobs/${data.job_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (jr.ok) {
                        const job = await jr.json();
                        if (job.status === 'completed') {
                            clearInterval(poll);
                            setExporting(false);
                            let url = '';
                            try {
                                const errorLog = JSON.parse(job.error_log);
                                url = errorLog.result_url;
                            } catch (e) {}
                            if (url) {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv.gz`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                success('Contacts export downloaded.');
                            } else {
                                warning('Export completed but no download URL was returned.');
                            }
                        } else if (job.status === 'failed') {
                            clearInterval(poll);
                            setExporting(false);
                            error('Export failed.');
                        }
                    }
                } catch (e) {}
            }, 2000);
        } catch (e: any) {
            setExporting(false);
            error(e.message);
        }
    };

    const checklist = [
        { label: 'Unsubscribe link in every email', done: true },
        { label: 'Physical postal address in email footer', done: true },
        { label: 'Bounce handling (auto-suppression)', done: true },
        { label: 'Spam complaint suppression', done: true },
        { label: 'Data export available', done: true },
        { label: 'Right to erasure available', done: true },
        { label: 'Custom domain verification (SPF/DKIM)', done: false, note: 'Set up in Sending Domain' },
    ];

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Compliance & GDPR"
                subtitle="Privacy tooling and audit-ready controls for exports, erasure requests, and baseline messaging compliance."
                action={<Badge variant="warning">Trust Layer</Badge>}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Checklist Items" value={checklist.length} />
                <StatCard label="Completed" value={checklist.filter((item) => item.done).length} />
                <StatCard label="Needs Action" value={checklist.filter((item) => !item.done).length} />
                <StatCard label="GDPR Tools" value="2" />
            </div>

            <div className="space-y-6">
                    <SectionCard
                        title="Data Portability Export"
                        description="Download a CSV of all your contacts including their status, subscription history, and custom fields. Required for GDPR Article 20."
                    >
                        <Button
                            onClick={handleExport}
                            disabled={exporting}
                            variant="outline"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {exporting ? 'Generating export…' : 'Download All Contacts (CSV)'}
                        </Button>
                    </SectionCard>

                    <SectionCard
                        title="Right to Erasure (GDPR Art. 17)"
                        description="Enter a subscriber's email address to anonymize all their personal data. Analytics history is preserved but all PII is replaced with anonymized placeholders."
                    >

                        <div className="flex gap-3">
                            <Input
                                type="email"
                                value={eraseEmail}
                                onChange={e => setEraseEmail(e.target.value)}
                                className="flex-1"
                                placeholder="subscriber@example.com"
                            />
                            <Button
                                onClick={() => setConfirmEraseOpen(true)}
                                disabled={erasing || !eraseEmail.trim()}
                                variant="danger"
                            >
                                {erasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {erasing ? 'Erasing…' : 'Erase Contact'}
                            </Button>
                        </div>

                        {eraseError && (
                            <InlineAlert
                                className="mt-4"
                                variant="danger"
                                description={eraseError}
                                icon={<AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                            />
                        )}
                        {erased && (
                            <InlineAlert
                                className="mt-4"
                                variant="success"
                                description="Contact PII has been anonymized. Campaign metrics are preserved."
                                icon={<Check className="h-4 w-4 flex-shrink-0" />}
                            />
                        )}

                        <InlineAlert
                            className="mt-4"
                            variant="warning"
                            title="Irreversible action"
                            description={<>This action replaces the email, name and other PII with <code className="rounded bg-black/20 px-1">deleted_xxx@gdpr.invalid</code>. It cannot be undone.</>}
                        />
                    </SectionCard>

                    <SectionCard title="Compliance Checklist">
                        <ul className="space-y-3">
                            {checklist.map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${item.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {item.done ? '✓' : '!'}
                                    </span>
                                    <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                                    {item.note && <span className="text-xs text-[var(--text-muted)]">← {item.note}</span>}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                </div>

            <ConfirmModal
                isOpen={confirmEraseOpen}
                onClose={() => setConfirmEraseOpen(false)}
                onConfirm={handleGdprErase}
                title="Erase contact PII?"
                message={eraseEmail ? `This will permanently anonymize all personal data for ${eraseEmail}. This cannot be undone.` : 'This will permanently anonymize this contact.'}
                confirmLabel="Erase Contact"
                variant="danger"
                isLoading={erasing}
            />
        </div>
    );
}
