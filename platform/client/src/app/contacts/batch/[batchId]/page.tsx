"use client";

import { useState, useEffect, useDeferredValue } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Search, FileSpreadsheet, Users, Globe2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const API_BASE = "http://127.0.0.1:8000";

interface DomainStat {
    domain: string;
    count: number;
    suggested_domain?: string;
    reason?: string;
}

export default function BatchDetailPage() {
    const { batchId } = useParams();
    const router = useRouter();
    const { token } = useAuth();

    const [contacts, setContacts] = useState<any[]>([]);
    const [batch, setBatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [domainFilters, setDomainFilters] = useState<string[]>([]);
    const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
    const [domainLoading, setDomainLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchBatch = async () => {
        if (!token) return;
        const res = await fetch(`${API_BASE}/contacts/batches`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const found = (json.data || []).find((b: any) => b.id === batchId);
        setBatch(found || null);
    };

    const fetchContacts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "20",
                batch_id: batchId as string,
                ...(deferredSearch ? { search: deferredSearch } : {}),
                ...(domainFilters.length > 0 ? { domains: domainFilters.join(",") } : {})
            });
            const res = await fetch(`${API_BASE}/contacts/?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setContacts(json.data || []);
            setTotal(json.meta?.total || 0);
            setTotalPages(json.meta?.total_pages || 0);
        } catch { setContacts([]); }
        finally { setLoading(false); }
    };

    const fetchDomains = async () => {
        if (!token) return;
        setDomainLoading(true);
        try {
            const params = new URLSearchParams({
                limit: "12",
                batch_id: batchId as string
            });
            const res = await fetch(`${API_BASE}/contacts/domains?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setDomainStats(json.data || []);
        } catch {
            setDomainStats([]);
        } finally {
            setDomainLoading(false);
        }
    };

    useEffect(() => { fetchBatch(); }, [token, batchId]);
    useEffect(() => { fetchContacts(); }, [token, batchId, page, deferredSearch, domainFilters]);
    useEffect(() => { fetchDomains(); }, [token, batchId]);

    const toggleDomainFilter = (domain: string) => {
        setPage(1);
        setDomainFilters((current) =>
            current.includes(domain)
                ? current.filter((item) => item !== domain)
                : [...current, domain]
        );
    };

    const colors = {
        bg: "var(--bg-primary)", bgMuted: "var(--bg-card)", border: "var(--border)",
        text: "var(--text-primary)", textSecondary: "var(--text-muted)",
        accent: "var(--accent)", success: "var(--success)"
    };

    return (
        <div style={{ padding: "24px 32px", maxWidth: "1100px" }}>
            {/* Back link */}
            <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: colors.textSecondary, cursor: "pointer", fontSize: "13px", marginBottom: "20px", padding: 0 }}>
                <ArrowLeft size={14} /> Back to Contacts
            </button>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileSpreadsheet size={20} color="#3B82F6" />
                </div>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: 600, color: colors.text, margin: 0 }}>
                        {batch ? batch.file_name : "Loading..."}
                    </h1>
                    <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "2px 0 0" }}>
                        {batch && `${batch.imported_count.toLocaleString()} contacts · Imported ${new Date(batch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                    </p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px" }}>
                    <Users size={14} color="#3B82F6" />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#60A5FA" }}>{total.toLocaleString()}</span>
                    <span style={{ fontSize: "12px", color: colors.textSecondary }}>contacts</span>
                </div>
            </div>

            <div style={{
                marginBottom: "18px",
                padding: "16px",
                border: `1px solid ${colors.border}`,
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.06))"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <Globe2 size={15} color="#93C5FD" />
                    <span style={{ fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#93C5FD", fontWeight: 700 }}>
                        Batch Domains
                    </span>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <div style={{ position: "relative", flex: "1 1 320px" }}>
                        <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: colors.textSecondary }} />
                        <input
                            placeholder="Search by email..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            style={{ width: "100%", padding: "8px 12px 8px 34px", fontSize: "13px", border: `1px solid ${colors.border}`, borderRadius: "10px", outline: "none", boxSizing: "border-box", backgroundColor: colors.bgMuted, color: colors.text }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "8px", flex: "1 1 240px" }}>
                        <select
                            value={domainFilters[0] || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                setPage(1);
                                setDomainFilters(value ? [value] : []);
                            }}
                            style={{ flex: 1, padding: "8px 12px", fontSize: "13px", border: `1px solid ${colors.border}`, borderRadius: "10px", backgroundColor: colors.bgMuted, color: colors.text }}
                        >
                            <option value="">All batch domains</option>
                            {domainStats.map((domain) => (
                                <option key={domain.domain} value={domain.domain}>
                                    {domain.domain} ({domain.count})
                                </option>
                            ))}
                        </select>
                        {domainFilters.length > 0 && (
                            <button
                                onClick={() => { setDomainFilters([]); setPage(1); }}
                                style={{ padding: "8px 12px", fontSize: "13px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "10px", color: colors.text, cursor: "pointer" }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {domainLoading && domainStats.length === 0 ? (
                        <span style={{ fontSize: "12px", color: colors.textSecondary }}>Loading domains...</span>
                    ) : domainStats.map((entry) => (
                        <button
                            key={entry.domain}
                            onClick={() => toggleDomainFilter(entry.domain)}
                            style={{
                                padding: "8px 10px",
                                borderRadius: "12px",
                                border: `1px solid ${domainFilters.includes(entry.domain) ? "rgba(59,130,246,0.5)" : colors.border}`,
                                backgroundColor: domainFilters.includes(entry.domain) ? "rgba(59,130,246,0.12)" : "rgba(9,9,11,0.24)",
                                color: colors.text,
                                cursor: "pointer",
                                textAlign: "left"
                            }}
                        >
                            <div style={{ fontSize: "12px", fontWeight: 600 }}>{entry.domain}</div>
                            <div style={{ fontSize: "11px", color: colors.textSecondary }}>{entry.count} contacts</div>
                        </button>
                    ))}
                </div>
                {domainFilters.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                        {domainFilters.map((domain) => (
                            <span
                                key={domain}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: "999px",
                                    background: "rgba(59,130,246,0.12)",
                                    border: "1px solid rgba(59,130,246,0.25)",
                                    color: "#BFDBFE",
                                    fontSize: "12px"
                                }}
                            >
                                {domain}
                            </span>
                        ))}
                    </div>
                )}
                {domainStats.some((entry) => entry.suggested_domain) && (
                    <div style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(245,158,11,0.25)",
                        backgroundColor: "rgba(245,158,11,0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#FDE68A",
                        fontSize: "12px"
                    }}>
                        <AlertTriangle size={14} />
                        Possible typo domains found in this batch. Review entries like{" "}
                        {domainStats.filter((entry) => entry.suggested_domain).slice(0, 2).map((entry) => `${entry.domain} -> ${entry.suggested_domain}`).join(", ")}.
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                        <tr style={{ backgroundColor: colors.bgMuted, borderBottom: `1px solid ${colors.border}` }}>
                            <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Email</th>
                            <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Status</th>
                            <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: colors.textSecondary }}>Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ padding: "32px", textAlign: "center", color: colors.textSecondary }}>Loading...</td></tr>
                        ) : contacts.length === 0 ? (
                            <tr><td colSpan={3} style={{ padding: "48px", textAlign: "center", color: colors.textSecondary }}>No contacts found</td></tr>
                        ) : contacts.map((c) => (
                            <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td style={{ padding: "10px 16px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <Link href={`/contacts/${c.id}`} style={{ color: colors.accent, textDecoration: "none", fontWeight: 500 }}>
                                            {c.email}
                                        </Link>
                                        {c.email_domain && (
                                            <span style={{
                                                width: "fit-content",
                                                padding: "2px 8px",
                                                fontSize: "11px",
                                                borderRadius: "999px",
                                                backgroundColor: "rgba(59,130,246,0.12)",
                                                color: "#93C5FD",
                                                border: "1px solid rgba(59,130,246,0.18)"
                                            }}>
                                                {c.email_domain}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                    <span style={{
                                        padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
                                        background: c.status === "subscribed" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                        color: c.status === "subscribed" ? "#22C55E" : "#EF4444",
                                        border: `1px solid ${c.status === "subscribed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
                                    }}>
                                        {c.status}
                                    </span>
                                </td>
                                <td style={{ padding: "10px 16px", color: colors.textSecondary, fontSize: "12px" }}>
                                    {new Date(c.created_at).toLocaleDateString()}
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
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            style={{ padding: "6px 12px", fontSize: "13px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "6px", color: colors.text, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
                            ← Prev
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            style={{ padding: "6px 12px", fontSize: "13px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "6px", color: colors.text, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
