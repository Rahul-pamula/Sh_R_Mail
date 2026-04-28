"use client";

import { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Eye,
    Mail,
    Users,
    FileText,
    Loader2,
    Calendar,
    Send,
    AlertTriangle,
    X,
} from "lucide-react";
import { Button, ModalShell, SectionCard, InlineAlert } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string | null;
    onActionComplete?: () => void;
}

export default function ReviewCampaignModal({ isOpen, onClose, campaignId, onActionComplete }: Props) {
    const { token } = useAuth();
    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (isOpen && campaignId && token) {
            loadCampaign();
        } else {
            setCampaign(null);
            setError("");
            setSuccessMsg("");
        }
    }, [isOpen, campaignId, token]);

    const loadCampaign = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load campaign details.");
            const data = await res.json();
            setCampaign(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!campaignId || !token) return;
        setActionLoading("approve");
        setError("");
        try {
            // Step 1: awaiting_review → approved
            const approveRes = await fetch(`${API_BASE}/campaigns/${campaignId}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!approveRes.ok) {
                const errData = await approveRes.json();
                throw new Error(errData.detail || "Failed to approve campaign.");
            }

            // Step 2: approved → sending (or scheduled)
            const endpoint = campaign.scheduled_at
                ? `/campaigns/${campaignId}/schedule`
                : `/campaigns/${campaignId}/send`;
            const payload = campaign.scheduled_at
                ? { scheduled_at: campaign.scheduled_at, target_list_id: campaign.audience_target || "all" }
                : { target_list_id: campaign.audience_target || "all" };

            const sendRes = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!sendRes.ok) {
                const errData = await sendRes.json();
                throw new Error(errData.detail || "Campaign approved but failed to dispatch.");
            }

            setSuccessMsg(campaign.scheduled_at ? "Campaign approved and scheduled." : "Campaign approved and launched.");
            setTimeout(() => {
                onActionComplete?.();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!campaignId || !token) return;
        setActionLoading("reject");
        setError("");
        try {
            const res = await fetch(`${API_BASE}/campaigns/${campaignId}/reject`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to reject campaign.");
            }

            setSuccessMsg("Campaign returned to draft.");
            setTimeout(() => {
                onActionComplete?.();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Review Campaign"
            description="Verify the content and audience before approving this campaign for dispatch."
            maxWidthClass="max-w-4xl"
        >
            {loading ? (
                <div className="flex h-64 flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
                    <p className="text-sm text-[var(--text-muted)]">Fetching campaign details...</p>
                </div>
            ) : error ? (
                <div className="py-8">
                    <InlineAlert variant="danger" title="Error" description={error} />
                </div>
            ) : campaign ? (
                <div className="space-y-6">
                    {successMsg && (
                        <InlineAlert variant="success" description={successMsg} />
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                            <SectionCard title="Basic Details">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                                        <span className="font-medium">{campaign.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                                        <span>{campaign.subject}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Users className="h-4 w-4 text-[var(--text-muted)]" />
                                        <span>Audience: {campaign.audience_target || "All Contacts"}</span>
                                    </div>
                                    {campaign.scheduled_at && (
                                        <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
                                            <Calendar className="h-4 w-4" />
                                            <span>Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            <SectionCard title="Sender Identity">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">From</p>
                                    <p className="text-sm font-medium">
                                        {campaign.from_name} &lt;{campaign.from_prefix}@{campaign.domain_name || "..."}&gt;
                                    </p>
                                </div>
                            </SectionCard>
                        </div>

                        <SectionCard title="Email Preview">
                            <div className="h-[240px] overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white">
                                <iframe
                                    srcDoc={campaign.body_html || "<p>No content</p>"}
                                    className="h-full w-full border-none"
                                    style={{ transform: "scale(0.8)", transformOrigin: "top left", width: "125%", height: "125%" }}
                                />
                            </div>
                        </SectionCard>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs">Verify all details before launching.</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleReject}
                                isLoading={actionLoading === "reject"}
                                disabled={!!actionLoading || !!successMsg}
                            >
                                <XCircle className="h-4 w-4" />
                                Reject & Edit
                            </Button>
                            <Button
                                onClick={handleApprove}
                                isLoading={actionLoading === "approve"}
                                disabled={!!actionLoading || !!successMsg}
                            >
                                {campaign.scheduled_at ? <Calendar className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                {campaign.scheduled_at ? "Approve & Schedule" : "Approve & Send Now"}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </ModalShell>
    );
}
