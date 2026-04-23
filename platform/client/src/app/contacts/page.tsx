"use client";

import React, { useState, useEffect, useRef, useDeferredValue } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
    Search,
    Upload,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
    AlertTriangle,
    Check,
    FileText,
    FileSpreadsheet,
    Download,
    Globe2,
    Loader2,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ===== API Helper =====
const API_BASE = "http://localhost:8000";

function apiHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

// ===== Types =====
interface Contact {
    id: string;
    email: string;
    email_domain?: string | null;
    first_name: string | null;
    last_name: string | null;
    custom_fields: Record<string, string> | null;
    tags?: string[];
    created_at: string;
}

interface DomainStat {
    domain: string;
    count: number;
    suggested_domain?: string;
    reason?: string;
}

interface Stats {
    total_contacts: number;
    limit: number;
    usage_percent: number;
    available: number;
}

interface Batch {
    id: string;
    file_name: string;
    total_rows: number;
    imported_count: number;
    failed_count: number;
    status: string;
    errors?: any;
    meta?: any;
    created_at: string;
}

// ===== ErrorRow Component =====
function ErrorRow({ err, idx, batchId, token, colors, onResolved }: {
    err: any; idx: number; batchId: string; token: string;
    colors: any; onResolved: () => void;
}) {
    const [email, setEmail] = useState(err.email || "");
    const [saving, setSaving] = useState(false);
    const [resolved, setResolved] = useState(false);

    const inputStyle = {
        padding: "4px 8px", fontSize: "12px", border: `1px solid ${colors.border}`,
        borderRadius: "4px", width: "100%", boxSizing: "border-box" as const,
        backgroundColor: "var(--bg-primary)", color: "var(--text-primary)"
    };

    const handleResolve = async () => {
        if (!email.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/contacts/resolve-error`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ batch_id: batchId, error_index: idx, email })
            });
            if (res.ok) {
                setResolved(true);
                setTimeout(onResolved, 500);
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to add contact");
            }
        } catch { alert("Error resolving contact"); }
        setSaving(false);
    };

    if (resolved) {
        return (
            <tr style={{ backgroundColor: "var(--success-bg)" }}>
                <td colSpan={6} style={{ padding: "8px 12px", color: colors.success, fontSize: "12px", fontWeight: 500 }}>
                    ✓ {email} added successfully
                </td>
            </tr>
        );
    }

    return (
        <tr style={{ borderTop: `1px solid ${colors.dangerBorder}` }}>
            <td style={{ padding: "6px 12px", color: colors.textSecondary, fontSize: "12px" }}>{err.row || "—"}</td>
            <td style={{ padding: "6px 8px" }}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </td>

            <td style={{ padding: "6px 12px", color: colors.danger, fontSize: "11px" }}>{err.reason}</td>
            <td style={{ padding: "6px 8px" }}>
                <button
                    onClick={handleResolve}
                    disabled={saving || !email.trim()}
                    style={{
                        padding: "4px 10px", fontSize: "11px", fontWeight: 500,
                        color: "white", backgroundColor: saving ? "var(--text-muted)" : colors.success,
                        border: "none", borderRadius: "4px", cursor: saving ? "wait" : "pointer",
                        display: "flex", alignItems: "center", gap: "3px"
                    }}
                >
                    <Plus style={{ width: "12px", height: "12px" }} /> Add
                </button>
            </td>
        </tr>
    );
}

export default function ContactsPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"contacts" | "history">("contacts");

    // Stats
    const [stats, setStats] = useState<Stats | null>(null);

    // Contacts
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [batchFilter, setBatchFilter] = useState("");
    const [domainFilter, setDomainFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
    const [domainsLoading, setDomainsLoading] = useState(false);

    // Dynamic columns
    const customFieldKeys = React.useMemo(() => {
        const keys = new Set<string>();
        contacts.forEach(c => {
            if (c.custom_fields) {
                Object.keys(c.custom_fields).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).sort();
    }, [contacts]);

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Batches
    const [batches, setBatches] = useState<Batch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [batchDomains, setBatchDomains] = useState<DomainStat[]>([]);
    const [batchDomainsLoading, setBatchDomainsLoading] = useState(false);
    const [batchContacts, setBatchContacts] = useState<Contact[]>([]);
    const [batchContactsLoading, setBatchContactsLoading] = useState(false);
    const [batchSearch, setBatchSearch] = useState("");
    const [batchDomainFilter, setBatchDomainFilter] = useState<string | null>(null);
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

    // Modals
    const [showUpload, setShowUpload] = useState(false);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [showBatchDelete, setShowBatchDelete] = useState<Batch | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Upload state
    const [uploadStep, setUploadStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rowCount, setRowCount] = useState(0);
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
    const [importResult, setImportResult] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null);

    // Phase 7.5: Job progress polling
    const [jobProgress, setJobProgress] = useState<{ id: string; progress: number; status: string; processed_items: number; total_items: number; failed_items: number } | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const contactsAbortRef = useRef<AbortController | null>(null);
    const domainsAbortRef = useRef<AbortController | null>(null);
    const batchesAbortRef = useRef<AbortController | null>(null);

    // Helper to get mapped column or empty
    const getMappedCol = (target: string) => {
        return Object.entries(columnMappings).find(([_, v]) => v === target)?.[0] || "";
    };
    const emailCol = getMappedCol("email");

    // ===== Data Fetching =====
    const fetchStats = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/contacts/stats`, { headers: apiHeaders(token) });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error("Stats error:", e); }
    };

    const fetchContacts = async () => {
        if (!token) return;
        setLoading(true);
        if (contactsAbortRef.current) {
            contactsAbortRef.current.abort();
        }
        const controller = new AbortController();
        contactsAbortRef.current = controller;
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20" });
            if (deferredSearch) params.set("search", deferredSearch);
            if (batchFilter) params.set("batch_id", batchFilter);
            if (domainFilter) params.set("domain", domainFilter);
            const res = await fetch(`${API_BASE}/contacts/?${params}`, { headers: apiHeaders(token), signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                setContacts(data.data || []);
                setTotalPages(data.meta?.total_pages || 0);
                setTotal(data.meta?.total || 0);
            }
        } catch (e: any) {
            if (e.name !== "AbortError") {
                console.error("Contacts error:", e);
            }
        }
        setLoading(false);
    };

    const fetchDomains = async () => {
        if (!token) return;
        setDomainsLoading(true);
        if (domainsAbortRef.current) {
            domainsAbortRef.current.abort();
        }
        const controller = new AbortController();
        domainsAbortRef.current = controller;
        try {
            const params = new URLSearchParams({ limit: "10" });
            if (batchFilter) params.set("batch_id", batchFilter);
            const res = await fetch(`${API_BASE}/contacts/domains?${params}`, { headers: apiHeaders(token), signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                setDomainStats(data.data || []);
            }
        } catch (e: any) {
            if (e.name !== "AbortError") {
                console.error("Domains error:", e);
            }
        }
        setDomainsLoading(false);
    };

    const fetchBatches = async () => {
        if (!token) return;
        setBatchesLoading(true);
        if (batchesAbortRef.current) {
            batchesAbortRef.current.abort();
        }
        const controller = new AbortController();
        batchesAbortRef.current = controller;
        try {
            // Add timestamp to bypass browser caching of the batches list
            const res = await fetch(`${API_BASE}/contacts/batches?t=${Date.now()}`, { headers: apiHeaders(token), signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                setBatches(data.data || []);
            }
        } catch (e: any) {
            if (e.name !== "AbortError") {
                console.error("Batches error:", e);
            }
        }
        setBatchesLoading(false);
    };

    useEffect(() => { fetchStats(); }, [token]);
    useEffect(() => { fetchContacts(); }, [token, page, deferredSearch, batchFilter, domainFilter]);
    useEffect(() => { fetchDomains(); }, [token, batchFilter]);
    
    // Optimized Polling: Only poll history if specifically on that tab
    useEffect(() => {
        if (token && activeTab === "history") {
            fetchBatches();
            const interval = setInterval(fetchBatches, 8000); // Poll every 8 seconds to prevent "looping" logs
            return () => clearInterval(interval);
        }
    }, [token, activeTab]);

    // ===== Selection =====
    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    const toggleSelectAll = () => {
        if (selected.size === contacts.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(contacts.map(c => c.id)));
        }
    };

    // ===== Upload Flow =====
    const handleFileSelect = async (f: File) => {
        setFile(f);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", f);
            const res = await fetch(`${API_BASE}/contacts/upload/preview`, {
                method: "POST",
                headers: apiHeaders(token!),
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setHeaders(data.headers);
                setRowCount(data.row_count);
                // Auto-detect columns by name matching
                const autoMap: Record<string, string> = {};
                data.headers.forEach((col: string) => {
                    const lower = col.toLowerCase().trim();
                    if (lower === "email" || lower === "email address" || lower === "e-mail") {
                        autoMap[col] = "email";
                    } else if (lower === "first name" || lower === "firstname" || lower === "fname") {
                        autoMap[col] = "first_name";
                    } else if (lower === "last name" || lower === "lastname" || lower === "lname") {
                        autoMap[col] = "last_name";
                    } else {
                        // Default to skip
                        autoMap[col] = "skip";
                    }
                });
                setColumnMappings(autoMap);
                setUploadStep(2);
            } else {
                const err = await res.json();
                alert(err.detail || "Preview failed");
            }
        } catch (e: any) {
            console.error("Upload error caught:", e);
            alert(`Upload failed: ${e.message || e}`);
        }
        setUploading(false);
    };

    const handleImport = async () => {
        if (!file || !emailCol) return;
        setUploading(true);
        try {
            // Build custom field mappings
            const customMappings: Record<string, string> = {};
            Object.entries(columnMappings).forEach(([csvCol, target]) => {
                if (target.startsWith("custom:")) {
                    const fieldName = target.replace("custom:", "");
                    customMappings[fieldName] = csvCol;
                }
            });

            // 1. INITIALIZE (Get S3 Ticket)
            const initRes = await fetch(`${API_BASE}/contacts/import/initialize?project_id=default`, {
                method: "POST",
                headers: { ...apiHeaders(token!), "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    content_type: file.type || "text/csv",
                    estimated_rows: rowCount
                })
            });
            
            if (!initRes.ok) {
                const err = await initRes.json();
                throw new Error(err.detail || "Failed to initialize import");
            }
            const initData = await initRes.json();

            // 2. UPLOAD TO S3 (Direct via Signed URL using PUT)
            const s3Res = await fetch(initData.upload_url, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "text/csv"
                },
                body: file
            });
            
            if (!s3Res.ok) throw new Error("Failed to upload file to storage");

            // 3. SIGNAL PROCESS (Trigger RabbitMQ)
            const processRes = await fetch(`${API_BASE}/contacts/import/process/${initData.job_id}`, {
                method: "POST",
                headers: { ...apiHeaders(token!), "Content-Type": "application/json" },
                body: JSON.stringify({
                    email_col: emailCol,
                    first_name_col: getMappedCol("first_name") || null,
                    last_name_col: getMappedCol("last_name") || null,
                    custom_mappings: Object.keys(customMappings).length > 0 ? customMappings : null
                })
            });

            if (!processRes.ok) throw new Error("Failed to start processing");

            // 4. POLL FOR PROGRESS
            setJobProgress({ 
                id: initData.job_id, 
                progress: 0, 
                status: 'pending', 
                processed_items: 0, 
                total_items: rowCount, 
                failed_items: 0 
            });
            setUploadStep(3); // Progress UI

            pollRef.current = setInterval(async () => {
                try {
                    // Update this endpoint to poll the new import_jobs table
                    // Add timestamp to bypass browser caching
                    const jr = await fetch(`${API_BASE}/contacts/jobs/${initData.job_id}?t=${Date.now()}`, { headers: apiHeaders(token!) });
                    if (jr.ok) {
                        const job = await jr.json();
                        // For the new table, we expect: status, processed_rows, failed_rows, total_rows
                        const processed = job.processed_rows || 0;
                        const failed = job.failed_rows || 0;
                        const total = job.total_rows || rowCount;
                        const progressPct = total > 0 ? Math.round(((processed + failed) / total) * 100) : 0;
                        
                        setJobProgress({ 
                            id: job.id, 
                            progress: progressPct, 
                            status: job.status, 
                            processed_items: processed, 
                            total_items: total, 
                            failed_items: failed 
                        });
                        
                        if (job.status === 'completed' || job.status === 'failed') {
                            if (pollRef.current) clearInterval(pollRef.current);
                            setImportResult({
                                total: total,
                                success: processed,
                                failed: failed,
                                batch_id: null,
                                skipped_blank: 0,
                                skipped_duplicates: 0,
                            });
                            setUploadStep(4);
                            // Refresh all data
                            fetchStats();
                            fetchContacts();
                            fetchDomains();
                            fetchBatches();
                            // Second check after a tiny delay just to be 100% safe
                            setTimeout(() => fetchBatches(), 1500);
                        }
                    } else {
                        console.error("Polling fetch failed:", jr.status);
                    }
                } catch (err) { 
                    console.error("Polling error caught:", err);
                }
            }, 1000);

        } catch (e: any) { 
            console.error(e);
            alert(`Import failed: ${e.message}`); 
        } finally {
            setUploading(false);
        }
    };

    const resetUpload = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setShowUpload(false);
        setUploadStep(1);
        setFile(null);
        setHeaders([]);
        setRowCount(0);
        setColumnMappings({});
        setImportResult(null);
        setJobProgress(null);
    };

    // ===== Delete Operations =====
    const handleSingleDelete = async (id: string) => {
        if (!confirm("Delete this contact?")) return;
        try {
            await fetch(`${API_BASE}/contacts/${id}`, {
                method: "DELETE",
                headers: apiHeaders(token!)
            });
            fetchContacts();
            fetchStats();
            fetchDomains();
        } catch (e) { alert("Delete failed"); }
    };

    const handleBulkDelete = async () => {
        try {
            await fetch(`${API_BASE}/contacts/bulk-delete`, {
                method: "POST",
                headers: { ...apiHeaders(token!), "Content-Type": "application/json" },
                body: JSON.stringify({ contact_ids: Array.from(selected) })
            });
            setSelected(new Set());
            setShowBulkDelete(false);
            fetchContacts();
            fetchStats();
            fetchDomains();
        } catch (e) { alert("Bulk delete failed"); }
    };

    const handleDeleteAll = async () => {
        try {
            await fetch(`${API_BASE}/contacts/all`, {
                method: "DELETE",
                headers: apiHeaders(token!)
            });
            setShowDeleteAll(false);
            setDeleteConfirmText("");
            fetchContacts();
            fetchStats();
            fetchBatches();
            fetchDomains();
        } catch (e) { alert("Delete all failed"); }
    };

    const handleDeleteBatch = async (batch: Batch) => {
        try {
            await fetch(`${API_BASE}/contacts/batch/${batch.id}`, {
                method: "DELETE",
                headers: apiHeaders(token!)
            });
            setShowBatchDelete(null);
            fetchContacts();
            fetchStats();
            fetchBatches();
            fetchDomains();
        } catch (e) { alert("Batch delete failed"); }
    };

    // ===== Styles =====
    const colors = {
        bg: "var(--bg-primary)",
        bgMuted: "var(--bg-card)",
        border: "var(--border)",
        text: "var(--text-primary)",
        textSecondary: "var(--text-muted)",
        accent: "var(--accent)",
        danger: "var(--danger)",
        dangerBg: "var(--danger-bg)",
        dangerBorder: "var(--danger-border)",
        success: "var(--success)"
    };

    const tabStyle = (active: boolean) => ({
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: 500 as const,
        color: active ? colors.accent : colors.textSecondary,
        background: "none",
        border: "none",
        borderTopStyle: "solid" as const,
        borderTopWidth: "0px",
        borderTopColor: "transparent",
        borderBottomStyle: "solid" as const,
        borderBottomWidth: active ? "2px" : "0px",
        borderBottomColor: active ? colors.accent : "transparent",
        cursor: "pointer",
        transition: "all 150ms"
    });

    const highlightedBatch = batches.find((entry) => entry.id === batchFilter) || null;

    const handleSelectBatch = async (batch: Batch) => {
        if (expandedBatch === batch.id) {
            setExpandedBatch(null);
            return;
        }
        
        // 1. Instantly show the expanded row (loading state)
        setExpandedBatch(batch.id);
        setBatchDomainsLoading(true);
        setBatchContactsLoading(true);
        setBatchSearch("");
        setBatchDomainFilter(null);
        
        try {
            // 2. Fetch data
            const [domainRes, contactRes] = await Promise.all([
                fetch(`${API_BASE}/contacts/domains?batch_id=${batch.id}`, { headers: apiHeaders(token!) }),
                fetch(`${API_BASE}/contacts/?batch_id=${batch.id}&limit=10`, { headers: apiHeaders(token!) })
            ]);

            const domainData = await domainRes.json();
            const contactData = await contactRes.json();

            setBatchDomains(domainData.data || []);
            setBatchContacts(contactData.data || []);
        } catch (e) {
            console.error("Failed to fetch batch details", e);
        } finally {
            setBatchDomainsLoading(false);
            setBatchContactsLoading(false);
        }
    };

    const fetchBatchContacts = async (batchId: string, search: string, domain: string | null) => {
        setBatchContactsLoading(true);
        try {
            const params = new URLSearchParams({
                batch_id: batchId,
                limit: "10",
                ...(search ? { search } : {}),
                ...(domain ? { domains: domain } : {})
            });
            const res = await fetch(`${API_BASE}/contacts/?${params}`, {
                headers: apiHeaders(token!)
            });
            const data = await res.json();
            setBatchContacts(data.data || []);
        } catch (e) {
            console.error("Failed to fetch batch contacts", e);
        } finally {
            setBatchContactsLoading(false);
        }
    };

    // Debounced search for batch contacts
    useEffect(() => {
        if (expandedBatch) {
            const timer = setTimeout(() => {
                fetchBatchContacts(expandedBatch, batchSearch, batchDomainFilter);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [batchSearch, batchDomainFilter, expandedBatch]);

    const handleExportBatch = async (batchId: string, fileName: string) => {
        try {
            const res = await fetch(`${API_BASE}/contacts/export?batch_id=${batchId}`, {
                headers: apiHeaders(token!)
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `export_${fileName.replace(/\.[^/.]+$/, "")}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert("Failed to export batch.");
        }
    };

    const handleExport = async () => {
        if (!token) return;
        setIsExporting(true);
        try {
            const res = await fetch(`${API_BASE}/contacts/export/async`, { 
                method: "POST",
                headers: apiHeaders(token) 
            });
            if (res.ok) {
                const data = await res.json();
                if (data.job_id) {
                    const poll = setInterval(async () => {
                        try {
                            const jr = await fetch(`${API_BASE}/contacts/jobs/${data.job_id}`, { headers: apiHeaders(token) });
                            if (jr.ok) {
                                const job = await jr.json();
                                if (job.status === 'completed') {
                                    clearInterval(poll);
                                    setIsExporting(false);
                                    let url = '';
                                    try {
                                        const errorLog = JSON.parse(job.error_log);
                                        url = errorLog.result_url;
                                    } catch (e) {}
                                    if (url) {
                                        const workspacePrefix = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || "workspace";
                                        const exportFilename = `${workspacePrefix.toLowerCase()}_contacts.csv.gz`;
                                        const finalUrl = url + (url.includes('?') ? '&' : '?') + `download=${encodeURIComponent(exportFilename)}`;
                                        
                                        const a = document.createElement("a");
                                        a.href = finalUrl;
                                        a.download = exportFilename;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    } else {
                                        alert("Export completed but no download URL found.");
                                    }
                                } else if (job.status === 'failed') {
                                    clearInterval(poll);
                                    setIsExporting(false);
                                    alert("Export failed.");
                                }
                            }
                        } catch (e) {}
                    }, 2000);
                } else {
                    setIsExporting(false);
                    alert("No export job ID returned.");
                }
            } else {
                setIsExporting(false);
                alert("Failed to start export.");
            }
        } catch (e) {
            setIsExporting(false);
            console.error("Export error:", e);
            alert("An error occurred starting export.");
        }
    };

    const handleBatchExport = async (batchId: string, batchFileName: string) => {
        if (!token) return;
        setDownloadingBatch(batchId);
        try {
            const res = await fetch(`${API_BASE}/contacts/export/batch/${batchId}`, {
                method: "GET",
                headers: apiHeaders(token),
            });
            if (res.ok) {
                const blob = await res.blob();
                const cleanName = batchFileName.replace(/\.[^/.]+$/, ""); // Strip original file extension
                const exportFilename = `batch_${cleanName}.csv.gz`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = exportFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else if (res.status === 429) {
                alert("An export is already running for this workspace.");
            } else {
                alert("Failed to export batch.");
            }
        } catch (e) {
            console.error("Batch Export error:", e);
            alert("An error occurred during batch export.");
        } finally {
            setDownloadingBatch(null);
        }
    };

    const btnPrimary = {
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: 500,
        color: "white",
        backgroundColor: colors.accent,
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    };

    const btnDanger = {
        ...btnPrimary,
        backgroundColor: colors.danger
    };

    const btnOutline = {
        ...btnPrimary,
        backgroundColor: "transparent",
        color: colors.text,
        border: `1px solid ${colors.border}`
    };

    return (
        <div style={{ padding: "24px 32px", maxWidth: "1200px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 600, color: colors.text, margin: 0 }}>Contacts</h1>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={handleExport} disabled={isExporting} style={{...btnOutline, opacity: isExporting ? 0.7 : 1}}>
                        {isExporting ? <Loader2 style={{ width: "16px", height: "16px", animation: "spin 2s linear infinite" }} /> : <Download style={{ width: "16px", height: "16px" }} />}
                        {isExporting ? "Preparing Export..." : "Export CSV"}
                    </button>
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    `}} />
                    <button
                        onClick={() => stats && stats.usage_percent < 100 ? setShowUpload(true) : null}
                        disabled={stats?.usage_percent === 100}
                        title={stats?.usage_percent === 100 ? "Contact limit reached — upgrade your plan to add more" : "Upload Contacts"}
                        style={{
                            ...btnPrimary,
                            ...(stats?.usage_percent === 100
                                ? { opacity: 0.5, cursor: 'not-allowed', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.12)', color: '#F87171' }
                                : {})
                        }}
                    >
                        <Upload style={{ width: "16px", height: "16px" }} /> Upload Contacts
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            {stats && (
                <div style={{
                    padding: "16px 20px",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                    marginBottom: "20px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                        <div>
                            <span style={{ fontSize: "24px", fontWeight: 600, color: colors.text }}>
                                {stats.total_contacts.toLocaleString()}
                            </span>
                            <span style={{ fontSize: "14px", color: colors.textSecondary, marginLeft: "6px" }}>
                                of {stats.limit.toLocaleString()} contacts
                            </span>
                        </div>
                        <span style={{ fontSize: "13px", color: colors.textSecondary }}>
                            {stats.usage_percent}% used
                        </span>
                    </div>
                    <div style={{ height: "4px", backgroundColor: "var(--bg-hover)", borderRadius: "2px" }}>
                        <div style={{
                            height: "100%",
                            width: `${Math.min(stats.usage_percent, 100)}%`,
                            backgroundColor: stats.usage_percent > 90 ? colors.danger : colors.accent,
                            borderRadius: "2px",
                            transition: "width 300ms ease"
                        }} />
                    </div>
                </div>
            )}

            {/* Contact limit warning banners */}
            {stats && stats.usage_percent >= 100 && (
                <div style={{
                    marginBottom: "16px", padding: "12px 16px",
                    borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)",
                    backgroundColor: "rgba(239,68,68,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <AlertTriangle style={{ width: "16px", height: "16px", color: "#F87171", flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#F87171", margin: "0 0 2px" }}>Contact limit reached</p>
                            <p style={{ fontSize: "12px", color: colors.textSecondary, margin: 0 }}>
                                You've used all {stats.limit.toLocaleString()} contacts on your plan. Upgrade to continue adding contacts.
                            </p>
                        </div>
                    </div>
                    <Link href="/settings/billing" style={{
                        padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                        backgroundColor: "rgba(239,68,68,0.15)", color: "#F87171",
                        border: "1px solid rgba(239,68,68,0.3)", textDecoration: "none", whiteSpace: "nowrap"
                    }}>
                        Upgrade Plan →
                    </Link>
                </div>
            )}
            {stats && stats.usage_percent >= 80 && stats.usage_percent < 100 && (
                <div style={{
                    marginBottom: "16px", padding: "12px 16px",
                    borderRadius: "8px", border: "1px solid rgba(234,179,8,0.3)",
                    backgroundColor: "rgba(234,179,8,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <AlertTriangle style={{ width: "16px", height: "16px", color: "#FDE047", flexShrink: 0 }} />
                        <p style={{ fontSize: "13px", color: "#FDE047", margin: 0 }}>
                            You've used <strong>{stats.usage_percent}%</strong> of your {stats.limit.toLocaleString()} contact limit.
                            Consider upgrading before you hit the cap.
                        </p>
                    </div>
                    <Link href="/settings/billing" style={{
                        padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                        backgroundColor: "rgba(234,179,8,0.12)", color: "#FDE047",
                        border: "1px solid rgba(234,179,8,0.3)", textDecoration: "none", whiteSpace: "nowrap"
                    }}>
                        View Plans →
                    </Link>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0", borderBottom: `1px solid ${colors.border}`, marginBottom: "20px" }}>
                <button onClick={() => setActiveTab("contacts")} style={tabStyle(activeTab === "contacts")}>
                    Contacts
                </button>
                <button onClick={() => setActiveTab("history")} style={tabStyle(activeTab === "history")}>
                    Import History
                </button>
                <div style={{ padding: "0 10px", display: "flex", alignItems: "center" }}>
                    <div style={{ width: "1px", height: "20px", backgroundColor: colors.border }}></div>
                </div>
                <button onClick={() => router.push("/contacts/suppression")} style={tabStyle(false)}>
                    Suppression List
                </button>
            </div>

            {/* ===== TAB: Contacts ===== */}
            {activeTab === "contacts" && (
                <>
                    <div style={{
                        marginBottom: "18px",
                        padding: "14px",
                        borderRadius: "12px",
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.bgMuted
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <Globe2 style={{ width: "15px", height: "15px", color: "#93C5FD" }} />
                            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#93C5FD", fontWeight: 700 }}>
                                Contact Filters
                            </span>
                            {highlightedBatch && (
                                <span style={{ fontSize: "12px", color: colors.textSecondary }}>
                                    {highlightedBatch.file_name}
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <div style={{ position: "relative", flex: "1 1 280px" }}>
                                <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: colors.textSecondary }} />
                                <input
                                    placeholder="Search by email..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px 10px 36px",
                                        fontSize: "14px",
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "10px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                        backgroundColor: "var(--bg-primary)",
                                        color: "var(--text-primary)"
                                    }}
                                />
                            </div>
                            <select
                                value={batchFilter}
                                onChange={(e) => {
                                    setBatchFilter(e.target.value);
                                    setDomainFilter("");
                                    setPage(1);
                                }}
                                style={{
                                    flex: "1 1 220px",
                                    padding: "10px 12px",
                                    fontSize: "14px",
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "10px",
                                    backgroundColor: "var(--bg-primary)",
                                    color: colors.text
                                }}
                            >
                                <option value="">All contacts</option>
                                {batches.filter((entry) => entry.imported_count > 0).map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.file_name} ({entry.imported_count})
                                    </option>
                                ))}
                            </select>
                            <select
                                value={domainFilter}
                                onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}
                                style={{
                                    flex: "1 1 220px",
                                    padding: "10px 12px",
                                    fontSize: "14px",
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "10px",
                                    backgroundColor: "var(--bg-primary)",
                                    color: colors.text
                                }}
                            >
                                <option value="">All domains</option>
                                {domainStats.map((entry) => (
                                    <option key={entry.domain} value={entry.domain}>
                                        {entry.domain} ({entry.count})
                                        {entry.suggested_domain ? ` • maybe ${entry.suggested_domain}` : ""}
                                    </option>
                                ))}
                            </select>
                            {(domainFilter || batchFilter) && (
                                <button onClick={() => { setBatchFilter(""); setDomainFilter(""); setPage(1); }} style={{ ...btnOutline, padding: "10px 14px", borderRadius: "10px", whiteSpace: "nowrap" }}>
                                    Clear
                                </button>
                            )}
                        </div>
                        {domainsLoading && domainStats.length === 0 && (
                            <p style={{ fontSize: "12px", color: colors.textSecondary, margin: "10px 0 0" }}>Loading domains...</p>
                        )}
                    </div>

                    {selected.size > 0 && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 16px",
                                backgroundColor: "rgba(59,130,246,0.1)",
                                border: `1px solid rgba(59,130,246,0.35)`,
                                borderRadius: "12px",
                                marginBottom: "16px",
                                boxShadow: "0 10px 28px rgba(59,130,246,0.12)"
                            }}
                        >
                            <span style={{ fontSize: "14px", fontWeight: 500, color: colors.text }}>
                                {selected.size} contact{selected.size > 1 ? "s" : ""} selected
                            </span>
                            <button onClick={() => setShowBulkDelete(true)} style={{ ...btnDanger, fontSize: "13px", padding: "6px 12px" }}>
                                <Trash2 style={{ width: "14px", height: "14px" }} /> Delete Selected
                            </button>
                            <button onClick={() => setSelected(new Set())} style={{ ...btnOutline, fontSize: "13px", padding: "6px 12px" }}>
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Contacts Table */}
                    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "800px" }}>
                            <thead>
                                <tr style={{ backgroundColor: colors.bgMuted, borderBottom: `1px solid ${colors.border}` }}>
                                    <th style={{ padding: "10px 12px", width: "40px", textAlign: "left" }}>
                                        <input
                                            type="checkbox"
                                            checked={contacts.length > 0 && selected.size === contacts.length}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: "pointer" }}
                                        />
                                    </th>
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Email</th>
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Tags</th>
                                    {customFieldKeys.map(key => (
                                        <th key={key} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: colors.textSecondary, textTransform: "capitalize" }}>
                                            {key.replace(/_/g, " ")}
                                        </th>
                                    ))}
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Created</th>
                                    <th style={{ padding: "10px 12px", width: "60px" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4 + customFieldKeys.length} style={{ padding: "32px", textAlign: "center", color: colors.textSecondary }}>Loading...</td></tr>
                                ) : contacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + customFieldKeys.length} style={{ padding: "48px", textAlign: "center" }}>
                                            <p style={{ color: colors.textSecondary, marginBottom: "12px" }}>
                                                {domainFilter
                                                    ? `No contacts found for ${domainFilter}. Clear the filter or import more data.`
                                                    : "No contacts yet. Upload a CSV or Excel file to get started."}
                                            </p>
                                            {domainFilter ? (
                                                <button onClick={() => { setDomainFilter(""); setPage(1); }} style={btnOutline}>Clear Domain Filter</button>
                                            ) : (
                                                <button onClick={() => setShowUpload(true)} style={btnPrimary}>Upload Contacts</button>
                                            )}
                                        </td>
                                    </tr>
                                ) : contacts.map((c) => (
                                    <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                        <td style={{ padding: "10px 12px" }}>
                                            <input
                                                type="checkbox"
                                                checked={selected.has(c.id)}
                                                onChange={() => toggleSelect(c.id)}
                                                style={{ cursor: "pointer" }}
                                            />
                                        </td>
                                        <td style={{ padding: "10px 12px", color: colors.accent, fontWeight: 500 }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <Link href={`/contacts/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                                                    {c.email}
                                                </Link>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: "11px", color: colors.textSecondary }}>
                                                        {(c.first_name || c.last_name)
                                                            ? [c.first_name, c.last_name].filter(Boolean).join(" ")
                                                            : "Unnamed contact"}
                                                    </span>
                                                    {c.email_domain && (
                                                        <span style={{
                                                            padding: "2px 8px",
                                                            fontSize: "11px",
                                                            borderRadius: "999px",
                                                            backgroundColor: "rgba(59,130,246,0.12)",
                                                            color: "#93C5FD",
                                                            border: "1px solid rgba(59,130,246,0.22)"
                                                        }}>
                                                            {c.email_domain}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 12px", color: colors.textSecondary }}>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                {c.tags?.map((t: string) => (
                                                    <span key={t} style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "var(--bg-hover)", border: `1px solid ${colors.border}`, borderRadius: "4px" }}>
                                                        {t}
                                                    </span>
                                                ))}
                                                {(!c.tags || c.tags.length === 0) && "—"}
                                            </div>
                                        </td>
                                        {customFieldKeys.map(key => (
                                            <td key={key} style={{ padding: "10px 12px", color: colors.textSecondary }}>
                                                {c.custom_fields?.[key] || "—"}
                                            </td>
                                        ))}
                                        <td style={{ padding: "10px 12px", color: colors.textSecondary, fontSize: "13px" }}>
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <button
                                                onClick={() => handleSingleDelete(c.id)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textSecondary, padding: "4px" }}
                                                title="Delete"
                                            >
                                                <Trash2 style={{ width: "14px", height: "14px" }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                            <span style={{ fontSize: "13px", color: colors.textSecondary }}>
                                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...btnOutline, opacity: page <= 1 ? 0.4 : 1 }}>
                                    <ChevronLeft style={{ width: "16px", height: "16px" }} /> Prev
                                </button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...btnOutline, opacity: page >= totalPages ? 0.4 : 1 }}>
                                    Next <ChevronRight style={{ width: "16px", height: "16px" }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    {stats && stats.total_contacts > 0 && (
                        <div style={{
                            marginTop: "32px",
                            padding: "16px 20px",
                            border: `1px solid ${colors.dangerBorder}`,
                            borderRadius: "8px",
                            backgroundColor: colors.dangerBg
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: colors.danger, margin: "0 0 4px 0" }}>Danger Zone</h3>
                                    <p style={{ fontSize: "13px", color: colors.textSecondary, margin: 0 }}>
                                        Permanently delete all {stats.total_contacts.toLocaleString()} contacts. This action cannot be undone.
                                    </p>
                                </div>
                                <button onClick={() => setShowDeleteAll(true)} style={btnDanger}>
                                    <AlertTriangle style={{ width: "14px", height: "14px" }} /> Delete All Contacts
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ===== TAB: Import History ===== */}
            {activeTab === "history" && (
                <div className="glass-panel shadow-card" style={{ 
                    border: `1px solid ${colors.border}`, borderRadius: "12px", 
                    overflow: "hidden", marginTop: "16px"
                }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "var(--bg-hover)", borderBottom: `1px solid ${colors.border}` }}>
                                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: 500, color: "var(--text-muted)" }}>File Name</th>
                                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: 500, color: "var(--text-muted)" }}>Status</th>
                                <th style={{ padding: "16px 20px", textAlign: "right", fontWeight: 500, color: "var(--text-muted)" }}>New</th>
                                <th style={{ padding: "16px 20px", textAlign: "right", fontWeight: 500, color: "var(--text-muted)" }}>Failed</th>
                                <th style={{ padding: "16px 20px", textAlign: "right", fontWeight: 500, color: "var(--text-muted)" }}>Total</th>
                                <th style={{ padding: "16px 20px", textAlign: "right", fontWeight: 500, color: "var(--text-muted)" }}>Date</th>
                                <th style={{ padding: "16px 20px", width: "100px" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {batchesLoading && batches.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: "64px", textAlign: "center" }}><Loader2 className="spinner" /></td></tr>
                            ) : batches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: "80px 40px", textAlign: "center" }}>
                                        <FileText style={{ width: "48px", height: "48px", margin: "0 auto 16px", opacity: 0.2, color: "var(--text-muted)" }} />
                                        <p style={{ color: "var(--text-muted)" }}>No import history found.</p>
                                    </td>
                                </tr>
                            ) : batches.map((b) => (
                                <React.Fragment key={b.id}>
                                    <tr 
                                        onClick={() => handleSelectBatch(b)}
                                        style={{ 
                                            borderBottom: `1px solid ${colors.border}`, 
                                            cursor: "pointer", transition: "background 150ms",
                                            backgroundColor: expandedBatch === b.id ? "rgba(59, 130, 246, 0.03)" : "transparent"
                                        }}
                                        onMouseEnter={(e) => { if (expandedBatch !== b.id) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                                        onMouseLeave={(e) => { if (expandedBatch !== b.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                                    >
                                        <td style={{ padding: "16px 20px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ 
                                                    width: "32px", height: "32px", borderRadius: "8px", 
                                                    backgroundColor: "rgba(59, 130, 246, 0.1)", 
                                                    display: "flex", alignItems: "center", justifyContent: "center" 
                                                }}>
                                                    <FileSpreadsheet style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleSelectBatch(b); }}
                                                    style={{ 
                                                        background: "none", border: "none", padding: 0,
                                                        color: "var(--accent)", fontWeight: 700, fontSize: "14px",
                                                        cursor: "pointer", textAlign: "left",
                                                        textDecoration: "underline", textDecorationColor: "transparent",
                                                        transition: "all 0.2s"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = "var(--accent)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = "transparent"}
                                                >
                                                    {b.file_name}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: "16px 20px" }}>
                                            {b.status === "completed" ? (
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "13px", fontWeight: 500 }}>
                                                    <CheckCircle2 style={{ width: "14px", height: "14px" }} /> Done
                                                </div>
                                            ) : b.status === "failed" ? (
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--danger)", fontSize: "13px", fontWeight: 500 }}>
                                                    <XCircle style={{ width: "14px", height: "14px" }} /> Failed
                                                </div>
                                            ) : (
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "13px", fontWeight: 500 }}>
                                                    <Loader2 className="spinner" style={{ width: "14px", height: "14px" }} /> Importing...
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "16px 20px", textAlign: "right", color: "var(--success)", fontWeight: 700 }}>{b.imported_count}</td>
                                        <td style={{ padding: "16px 20px", textAlign: "right", color: b.failed_count > 0 ? "var(--danger)" : "var(--text-muted)" }}>{b.failed_count}</td>
                                        <td style={{ padding: "16px 20px", textAlign: "right", fontWeight: 500 }}>{b.total_rows}</td>
                                        <td style={{ padding: "16px 20px", textAlign: "right", color: "var(--text-muted)", fontSize: "13px" }}>
                                            {new Date(b.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleExportBatch(b.id, b.file_name); }}
                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", transition: "color 0.2s" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                                    title="Export this batch"
                                                >
                                                    <Download style={{ width: "18px", height: "18px" }} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowBatchDelete(b); }} 
                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", transition: "color 0.2s" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                                    title="Delete this batch"
                                                >
                                                    <Trash2 style={{ width: "18px", height: "18px" }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {expandedBatch === b.id && (
                                        <tr style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
                                            <td colSpan={7} style={{ padding: "24px 40px", borderBottom: `1px solid ${colors.border}` }}>
                                                <div className="fade-in">
                                                    {/* Row 1: Summary Statistics Bar */}
                                                    <div style={{ 
                                                        display: "flex", gap: "24px", marginBottom: "20px", 
                                                        padding: "16px", backgroundColor: "rgba(255,255,255,0.02)", 
                                                        borderRadius: "10px", border: `1px solid ${colors.border}` 
                                                    }}>
                                                        <div>
                                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>New Contacts</div>
                                                            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--success)" }}>{b.imported_count || 0}</div>
                                                        </div>
                                                        <div style={{ width: "1px", backgroundColor: colors.border }} />
                                                        <div>
                                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Updated</div>
                                                            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)" }}>
                                                                {(() => {
                                                                    const meta = b.meta ? (typeof b.meta === "string" ? JSON.parse(b.meta) : b.meta) : {};
                                                                    return meta.updated || 0;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div style={{ width: "1px", backgroundColor: colors.border }} />
                                                        <div>
                                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Duplicates</div>
                                                            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-muted)" }}>
                                                                {(() => {
                                                                    const meta = b.meta ? (typeof b.meta === "string" ? JSON.parse(b.meta) : b.meta) : {};
                                                                    return meta.skipped_duplicates || 0;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div style={{ width: "1px", backgroundColor: colors.border }} />
                                                        <div>
                                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Failed</div>
                                                            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--danger)" }}>{b.failed_count || 0}</div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Typo Warnings & Domain Filters */}
                                                    {batchDomains.some(d => d.suggested_domain) && (
                                                        <div style={{ 
                                                            padding: "12px 16px", borderRadius: "10px", backgroundColor: "rgba(245,158,11,0.08)",
                                                            border: "1px solid rgba(245,158,11,0.2)", color: "#FDE68A", fontSize: "12px",
                                                            display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px"
                                                        }}>
                                                            <AlertTriangle style={{ width: "16px", height: "16px" }} />
                                                            <span>
                                                                Potential typos detected: {batchDomains.filter(d => d.suggested_domain).slice(0, 2).map(d => `${d.domain} → ${d.suggested_domain}`).join(", ")}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="domain-filters-container" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                                                        <button 
                                                            onClick={() => setBatchDomainFilter(null)}
                                                            className={`domain-chip ${!batchDomainFilter ? 'active' : ''}`}
                                                            style={{ 
                                                                padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                                                                backgroundColor: !batchDomainFilter ? "var(--accent)" : "rgba(255,255,255,0.06)",
                                                                color: !batchDomainFilter ? "white" : "var(--text-muted)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer",
                                                                transition: "all 0.2s"
                                                            }}
                                                        >
                                                            All Domains
                                                        </button>
                                                        {batchDomains.map((d, idx) => (
                                                            <button 
                                                                key={`${d.domain}-${idx}`}
                                                                onClick={() => setBatchDomainFilter(d.domain)}
                                                                style={{ 
                                                                    padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                                                                    backgroundColor: batchDomainFilter === d.domain ? "var(--accent)" : "rgba(255,255,255,0.06)",
                                                                    color: batchDomainFilter === d.domain ? "white" : "var(--text-muted)", 
                                                                    border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                                                                    transition: "all 0.2s"
                                                                }}
                                                            >
                                                                {d.domain} <span style={{ opacity: 0.5, fontSize: "10px" }}>{d.count}</span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px" }}>
                                                        {/* Left Column: Contact List & Search */}
                                                        <div>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                                                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Imported Contacts</h3>
                                                                <div style={{ position: "relative", width: "240px" }}>
                                                                    <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--text-muted)" }} />
                                                                    <input 
                                                                        placeholder="Search this batch..."
                                                                        value={batchSearch}
                                                                        onChange={(e) => setBatchSearch(e.target.value)}
                                                                        style={{ 
                                                                            width: "100%", padding: "6px 10px 6px 32px", fontSize: "12px",
                                                                            backgroundColor: "rgba(0,0,0,0.2)", border: `1px solid ${colors.border}`,
                                                                            borderRadius: "6px", color: "white", outline: "none"
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div style={{ maxHeight: "300px", overflowY: "auto", border: `1px solid ${colors.border}`, borderRadius: "8px" }}>
                                                                {batchContactsLoading ? (
                                                                    <div style={{ padding: "40px", textAlign: "center" }}><Loader2 className="spinner" /></div>
                                                                ) : batchContacts.length === 0 ? (
                                                                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No contacts found.</div>
                                                                ) : (
                                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                                                        <thead style={{ position: "sticky", top: 0, backgroundColor: "var(--bg-card)", zIndex: 10 }}>
                                                                            <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: `1px solid ${colors.border}` }}>
                                                                                <th style={{ padding: "10px 16px" }}>Email</th>
                                                                                <th style={{ padding: "10px 16px" }}>Name</th>
                                                                                <th style={{ padding: "10px 16px" }}>Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {batchContacts.map((c) => (
                                                                                <tr key={c.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                                                                                    <td style={{ padding: "10px 16px", color: "var(--accent)", fontWeight: 500 }}>{c.email}</td>
                                                                                    <td style={{ padding: "10px 16px" }}>{c.first_name || ""} {c.last_name || ""}</td>
                                                                                    <td style={{ padding: "10px 16px" }}>
                                                                                        <span style={{ 
                                                                                            padding: "2px 8px", borderRadius: "100px", fontSize: "10px", fontWeight: 700,
                                                                                            backgroundColor: "rgba(34, 197, 94, 0.1)", color: "var(--success)"
                                                                                        }}>SUBSCRIBED</span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right Column: Error Resolver */}
                                                        <div>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                                                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                                                                    Failed Contacts {b.failed_count > 0 && `(${b.failed_count})`}
                                                                </h3>
                                                                {b.failed_count > 0 && (
                                                                    <span style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 600 }}>Action Required</span>
                                                                )}
                                                            </div>

                                                            {b.failed_count === 0 ? (
                                                                <div style={{ padding: "32px 20px", textAlign: "center", backgroundColor: "rgba(34, 197, 94, 0.03)", borderRadius: "8px", border: "1px dashed rgba(34, 197, 94, 0.2)" }}>
                                                                    <CheckCircle2 style={{ width: "24px", height: "24px", color: "var(--success)", margin: "0 auto 8px" }} />
                                                                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>100% Success Rate!</p>
                                                                </div>
                                                            ) : (
                                                                <div style={{ maxHeight: "300px", overflowY: "auto", border: `1px solid ${colors.border}`, borderRadius: "8px" }}>
                                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                                                        <tbody>
                                                                            {(b.errors || []).map((err: any, idx: number) => (
                                                                                <ErrorRow 
                                                                                    key={idx} err={err} idx={idx} 
                                                                                    batchId={b.id} token={token!} 
                                                                                    colors={colors} onResolved={fetchBatches} 
                                                                                />
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== MODAL: Upload Flow ===== */}
            {showUpload && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-panel" style={{ padding: "24px", width: "480px", maxHeight: "80vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: colors.text }}>
                                Import Contacts (Step {uploadStep}/4)
                            </h2>
                            <button onClick={resetUpload} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textSecondary }}>
                                <X style={{ width: "20px", height: "20px" }} />
                            </button>
                        </div>

                        {/* Step 1: File Upload */}
                        {uploadStep === 1 && (
                            <div>
                                <label htmlFor="file-upload" style={{
                                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                    padding: "40px", border: `2px dashed ${colors.border}`, borderRadius: "8px", cursor: "pointer",
                                    backgroundColor: colors.bgMuted, transition: "border-color 150ms"
                                }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                                >
                                    <Upload style={{ width: "24px", height: "24px", color: colors.textSecondary, marginBottom: "8px" }} />
                                    <p style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px", color: colors.text }}>
                                        {uploading ? "Parsing..." : "Click to upload or drag and drop"}
                                    </p>
                                    <p style={{ fontSize: "12px", color: colors.textSecondary }}>CSV or Excel files (up to 2MB)</p>
                                    <input id="file-upload" type="file" accept=".csv,.xlsx" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} style={{ display: "none" }} />
                                </label>
                            </div>
                        )}

                        {/* Step 2: Dynamic Column Mapping */}
                        {uploadStep === 2 && (
                            <div>
                                <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "12px" }}>
                                    Map each file column to a contact field. Email is required.
                                </p>
                                <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
                                    {headers.map((col) => {
                                        const mapping = columnMappings[col] || "skip";
                                        const isCustom = mapping.startsWith("custom:");
                                        const customName = isCustom ? mapping.replace("custom:", "") : "";

                                        return (
                                            <div key={col} style={{ marginBottom: "10px", padding: "8px 10px", borderRadius: "6px", backgroundColor: mapping !== "skip" ? "var(--bg-hover)" : "transparent", border: `1px solid ${mapping !== "skip" ? colors.border : "transparent"}` }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{
                                                        fontSize: "13px", fontWeight: 500, color: colors.text,
                                                        minWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                                    }} title={col}>{col}</span>
                                                    <span style={{ fontSize: "13px", color: colors.textSecondary }}>→</span>
                                                    <select
                                                        value={isCustom ? "custom" : mapping}
                                                        onChange={(e) => {
                                                            const newMappings = { ...columnMappings };
                                                            const val = e.target.value;
                                                            if (val === "skip") {
                                                                delete newMappings[col];
                                                            } else if (val === "custom") {
                                                                // Set custom with default name from column header
                                                                newMappings[col] = `custom:${col.toLowerCase().replace(/\s+/g, "_")}`;
                                                            } else {
                                                                // Standard field — ensure uniqueness
                                                                Object.keys(newMappings).forEach(k => {
                                                                    if (newMappings[k] === val && k !== col) {
                                                                        delete newMappings[k];
                                                                    }
                                                                });
                                                                newMappings[col] = val;
                                                            }
                                                            setColumnMappings(newMappings);
                                                        }}
                                                        style={{
                                                            flex: 1, padding: "6px 8px", fontSize: "13px",
                                                            border: `1px solid ${colors.border}`, borderRadius: "6px", backgroundColor: "var(--bg-card)"
                                                        }}
                                                    >
                                                        <option value="skip">⊘ Skip</option>
                                                        <option value="email" disabled={!!getMappedCol("email") && getMappedCol("email") !== col}>📧 Email (required)</option>
                                                        <option value="custom">📋 Custom Field</option>
                                                    </select>
                                                </div>
                                                {isCustom && (
                                                    <div style={{ marginTop: "6px", paddingLeft: "118px" }}>
                                                        <input
                                                            type="text"
                                                            value={customName}
                                                            placeholder="Enter field name (e.g. phone, company)"
                                                            onChange={(e) => {
                                                                const newMappings = { ...columnMappings };
                                                                const fieldName = e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                                                                newMappings[col] = `custom:${fieldName}`;
                                                                setColumnMappings(newMappings);
                                                            }}
                                                            style={{
                                                                width: "100%", padding: "5px 8px", fontSize: "12px",
                                                                border: `1px solid ${colors.border}`, borderRadius: "4px",
                                                                backgroundColor: "var(--bg-card)", color: "var(--text-primary)"
                                                            }}
                                                        />
                                                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: colors.textSecondary }}>
                                                            Stored as: <code style={{ fontSize: "11px", backgroundColor: "var(--bg-hover)", padding: "1px 4px", borderRadius: "2px" }}>{customName || "..."}</code>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {!emailCol && (
                                    <p style={{ fontSize: "12px", color: colors.danger, marginTop: "8px" }}>⚠ You must map one column as Email</p>
                                )}
                                <button disabled={!emailCol} onClick={() => setUploadStep(3)}
                                    style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: "12px", opacity: emailCol ? 1 : 0.5 }}>
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Step 3: Validation (Only show if not polling) */}
                        {uploadStep === 3 && !jobProgress && (
                            <div>
                                <div style={{ padding: "16px", backgroundColor: colors.bgMuted, borderRadius: "8px", marginBottom: "16px" }}>
                                    <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 500, color: colors.text }}>Ready to import</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>📁 File: {file?.name}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>📊 Total rows: {rowCount}</p>
                                    <div style={{ marginTop: "10px", borderTop: `1px solid ${colors.border}`, paddingTop: "10px" }}>
                                        <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 600, color: colors.text }}>Field Mappings:</p>
                                        {Object.entries(columnMappings).map(([csvCol, target]) => (
                                            <p key={csvCol} style={{ margin: "0 0 3px", fontSize: "12px", color: colors.textSecondary }}>
                                                {csvCol} → <span style={{ fontWeight: 500, color: colors.text }}>
                                                    {target === "email" ? "📧 Email" : `📋 ${target.replace("custom:", "")}`}
                                                </span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button onClick={() => setUploadStep(2)} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>Back</button>
                                    <button onClick={handleImport} disabled={uploading}
                                        style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: uploading ? 0.6 : 1 }}>
                                        {uploading ? "Importing..." : "Import Contacts"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Progress Polling (Phase 7.5) */}
                        {uploadStep === 3 && jobProgress && (
                            <div style={{ textAlign: "center", padding: "20px 0" }}>
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "50%",
                                    background: `conic-gradient(${colors.accent} ${jobProgress.progress * 3.6}deg, var(--bg-hover) 0deg)`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 16px", position: "relative" as const
                                }}>
                                    <div style={{
                                        width: "38px", height: "38px", borderRadius: "50%",
                                        backgroundColor: "var(--bg-card)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "12px", fontWeight: 700, color: colors.accent
                                    }}>
                                        {jobProgress.progress}%
                                    </div>
                                </div>
                                <h3 style={{ fontSize: "16px", fontWeight: 600, color: colors.text, margin: "0 0 8px" }}>
                                    Processing Import...
                                </h3>
                                <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "0 0 16px" }}>
                                    {jobProgress.processed_items.toLocaleString()} / {jobProgress.total_items.toLocaleString()} contacts processed
                                </p>
                                {/* Progress bar */}
                                <div style={{
                                    height: "6px", backgroundColor: "var(--bg-hover)", borderRadius: "3px",
                                    overflow: "hidden", marginBottom: "12px"
                                }}>
                                    <div style={{
                                        height: "100%", width: `${jobProgress.progress}%`,
                                        backgroundColor: colors.accent, borderRadius: "3px",
                                        transition: "width 500ms ease"
                                    }} />
                                </div>
                                <p style={{ fontSize: "11px", color: colors.textSecondary, fontStyle: "italic" }}>
                                    Do not close this window. Your contacts are being processed in the background.
                                </p>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {uploadStep === 4 && importResult && (
                            <div style={{ textAlign: "center" }}>
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--success-bg)",
                                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
                                }}>
                                    <Check style={{ width: "24px", height: "24px", color: colors.success }} />
                                </div>
                                <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px", color: colors.text }}>Import Complete</h3>
                                <div style={{ padding: "12px 16px", backgroundColor: colors.bgMuted, borderRadius: "8px", textAlign: "left", marginBottom: "16px" }}>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>Total processed: {importResult.total}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.success, fontWeight: 500 }}>✓ Imported: {importResult.success}</p>
                                    {importResult.new !== undefined && <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>New: {importResult.new} | Updated: {importResult.updated}</p>}
                                    {importResult.skipped_blank > 0 && <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>Skipped blank rows: {importResult.skipped_blank}</p>}
                                    {importResult.skipped_duplicates > 0 && <p style={{ margin: "0 0 4px", fontSize: "13px", color: colors.textSecondary }}>Skipped duplicates: {importResult.skipped_duplicates}</p>}
                                    {importResult.failed > 0 && <p style={{ margin: 0, fontSize: "13px", color: colors.danger }}>✗ Failed: {importResult.failed}</p>}
                                </div>

                                {/* Failed contacts detail */}
                                {importResult.errors && importResult.errors.length > 0 && (
                                    <div style={{ textAlign: "left", marginBottom: "16px" }}>
                                        <p style={{ fontSize: "13px", fontWeight: 600, color: colors.danger, margin: "0 0 8px" }}>
                                            Failed Contacts — Fix these and re-upload:
                                        </p>
                                        <div style={{
                                            border: `1px solid ${colors.dangerBorder}`,
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            maxHeight: "200px",
                                            overflowY: "auto"
                                        }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: colors.dangerBg }}>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, color: colors.danger }}>Row</th>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, color: colors.danger }}>Email</th>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, color: colors.danger }}>Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {importResult.errors.map((err: any, i: number) => (
                                                        <tr key={i} style={{ borderTop: `1px solid ${colors.dangerBorder}` }}>
                                                            <td style={{ padding: "6px 10px", color: colors.textSecondary }}>{err.row || "—"}</td>
                                                            <td style={{ padding: "6px 10px", color: colors.text, fontFamily: "monospace", fontSize: "11px" }}>{err.email || "—"}</td>
                                                            <td style={{ padding: "6px 10px", color: colors.danger }}>{err.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {importResult.failed > importResult.errors.length && (
                                            <p style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
                                                Showing first {importResult.errors.length} of {importResult.failed} errors
                                            </p>
                                        )}
                                    </div>
                                )}

                                <button onClick={resetUpload} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>Done</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== MODAL: Bulk Delete Confirm ===== */}
            {showBulkDelete && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-panel" style={{ padding: "24px", width: "400px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <AlertTriangle style={{ width: "20px", height: "20px", color: colors.danger }} />
                            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: colors.text }}>Delete {selected.size} Contact{selected.size > 1 ? "s" : ""}?</h3>
                        </div>
                        <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "20px" }}>
                            This action cannot be undone. The selected contacts will be permanently removed.
                        </p>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button onClick={() => setShowBulkDelete(false)} style={btnOutline}>Cancel</button>
                            <button onClick={handleBulkDelete} style={btnDanger}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: Delete All (Type to Confirm) ===== */}
            {showDeleteAll && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-panel" style={{ padding: "24px", width: "440px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <AlertTriangle style={{ width: "20px", height: "20px", color: colors.danger }} />
                            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: colors.danger }}>Delete All Contacts</h3>
                        </div>
                        <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "16px" }}>
                            This will permanently delete <strong>{stats?.total_contacts.toLocaleString()}</strong> contacts and all import history. This action cannot be undone.
                        </p>
                        <p style={{ fontSize: "13px", color: colors.text, marginBottom: "8px", fontWeight: 500 }}>
                            Type <strong>DELETE</strong> to confirm:
                        </p>
                        <input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            style={{
                                width: "100%", padding: "8px 12px", fontSize: "14px",
                                border: `1px solid ${colors.dangerBorder}`, borderRadius: "6px",
                                marginBottom: "16px", boxSizing: "border-box",
                                backgroundColor: "var(--bg-card)", color: "var(--text-primary)"
                            }}
                        />
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button onClick={() => { setShowDeleteAll(false); setDeleteConfirmText(""); }} style={btnOutline}>Cancel</button>
                            <button onClick={handleDeleteAll} disabled={deleteConfirmText !== "DELETE"}
                                style={{ ...btnDanger, opacity: deleteConfirmText === "DELETE" ? 1 : 0.4 }}>
                                Delete All Contacts
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: Delete Batch Confirm ===== */}
            {showBatchDelete && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-panel" style={{ padding: "24px", width: "420px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <AlertTriangle style={{ width: "20px", height: "20px", color: colors.danger }} />
                            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: colors.text }}>Delete Import Batch?</h3>
                        </div>
                        <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "4px" }}>
                            This will delete all contacts imported from:
                        </p>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: colors.text, marginBottom: "4px" }}>
                            📄 {showBatchDelete.file_name}
                        </p>
                        <p style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "20px" }}>
                            {showBatchDelete.imported_count} contact{showBatchDelete.imported_count !== 1 ? "s" : ""} will be deleted.
                        </p>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button onClick={() => setShowBatchDelete(null)} style={btnOutline}>Cancel</button>
                            <button onClick={() => handleDeleteBatch(showBatchDelete)} style={btnDanger}>Delete Batch</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
