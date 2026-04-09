"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, Mail, Calendar, Tag, Plus, X, ListCollapse, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = "http://localhost:8000";

function apiHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

// ===== Light Mode Colors (Matched from campaigns page) =====
const colors = {
    bgPrimary: 'var(--bg-primary)',
    bgSecondary: '#f8fafc',
    bgElevated: '#f1f5f9',
    borderSubtle: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accentBlue: '#2563eb',
    statusSuccess: '#16a34a',
    statusWarning: '#ca8a04',
    statusError: '#dc2626',
    border: "var(--border)",
    bgCard: "var(--bg-card)",
    bgHover: "var(--bg-hover)",
};

interface ContactData {
    id: string;
    email: string;
    email_domain?: string | null;
    first_name: string | null;
    last_name: string | null;
    status: string;
    tags: string[] | null;
    custom_fields: Record<string, string> | null;
    created_at: string;
}

export default function ContactDetailsPage() {
    const router = useRouter();
    const params = useParams<{ id?: string }>();
    const contactId = params?.id || "";
    const { token } = useAuth();

    const [contact, setContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [draftEmail, setDraftEmail] = useState("");
    const [draftCustomFields, setDraftCustomFields] = useState<Record<string, string>>({});
    const [savingProfile, setSavingProfile] = useState(false);

    // Tagging state
    const [tagInput, setTagInput] = useState("");
    const [updatingTags, setUpdatingTags] = useState(false);

    useEffect(() => {
        if (!token) return;

        async function fetchContact() {
            setLoading(true);
            try {
                if (!contactId) return;
                const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
                    headers: apiHeaders(token!)
                });
                if (res.ok) {
                    const data = await res.json();
                    setContact(data);
                    setDraftEmail(data.email || "");
                    setDraftCustomFields(data.custom_fields || {});
                } else if (res.status === 404) {
                    setError("Contact not found");
                } else {
                    setError("Failed to load contact");
                }
            } catch (e) {
                setError("An error occurred");
            }
            setLoading(false);
        }

        fetchContact();
    }, [contactId, token]);

    const handleAddTag = async () => {
        const newTag = tagInput.trim();
        if (!newTag || !contact || !token) return;

        const currentTags = contact.tags || [];
        if (currentTags.includes(newTag)) {
            setTagInput("");
            return;
        }

        const newTags = [...currentTags, newTag];
        await saveTags(newTags);
        setTagInput("");
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!contact || !token) return;
        const newTags = (contact.tags || []).filter(t => t !== tagToRemove);
        await saveTags(newTags);
    };

    const saveTags = async (newTags: string[]) => {
        setUpdatingTags(true);
        try {
        if (!contactId) return;
        const res = await fetch(`${API_BASE}/contacts/${contactId}/tags`, {
            method: "POST",
            headers: {
                ...apiHeaders(token!),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ tags: newTags })
            });
            if (res.ok) {
                const data = await res.json();
                setContact(data.contact);
            } else {
                alert("Failed to update tags");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating tags");
        }
        setUpdatingTags(false);
    };

    const handleSaveContact = async () => {
        if (!token || !contact) return;
        setSavingProfile(true);
        try {
            const sanitizedCustomFields = Object.fromEntries(
                Object.entries(draftCustomFields).filter(([key, value]) => key.trim() && value.trim())
            );
        if (!contactId) return;
        const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
            method: "PATCH",
            headers: {
                    ...apiHeaders(token),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: draftEmail,
                    custom_fields: sanitizedCustomFields
                })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.detail || "Failed to update contact");
                return;
            }
            setContact(data.contact);
            setDraftEmail(data.contact.email || "");
            setDraftCustomFields(data.contact.custom_fields || {});
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert("Error updating contact");
        }
        setSavingProfile(false);
    };

    const handleCustomFieldChange = (key: string, value: string) => {
        setDraftCustomFields((current) => ({ ...current, [key]: value }));
    };

    const handleCustomFieldRename = (oldKey: string, nextKey: string) => {
        setDraftCustomFields((current) => {
            const updated = { ...current };
            const value = updated[oldKey] || "";
            delete updated[oldKey];
            if (nextKey.trim()) {
                updated[nextKey] = value;
            }
            return updated;
        });
    };

    const handleAddCustomField = () => {
        let nextKey = "new_field";
        let index = 1;
        while (draftCustomFields[nextKey]) {
            index += 1;
            nextKey = `new_field_${index}`;
        }
        setDraftCustomFields((current) => ({ ...current, [nextKey]: "" }));
    };

    if (loading) {
        return <div style={{ padding: "40px", color: colors.textSecondary }}>Loading contact details...</div>;
    }

    if (error || !contact) {
        return (
            <div style={{ padding: "40px", color: colors.statusError }}>
                <h2>{error}</h2>
                <button onClick={() => router.push("/contacts")} style={{ marginTop: "16px", padding: "8px 16px", border: `1px solid ${colors.border}`, borderRadius: "6px", background: "none", cursor: "pointer", color: "var(--text-primary)" }}>
                    Go back to Contacts
                </button>
            </div>
        );
    }

    const { email, email_domain, first_name, last_name, status, custom_fields, tags, created_at } = contact;
    const displayName = [first_name, last_name].filter(Boolean).join(" ") || "Unnamed Contact";

    return (
        <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>
            {/* Header / Back Link */}
            <Link href="/contacts" style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px',
                color: "var(--text-muted)", textDecoration: 'none', marginBottom: '24px'
            }}>
                <ArrowLeft style={{ width: '16px', height: '16px' }} />
                Back to Contacts
            </Link>

            {/* Profile Header */}
            <div style={{
                display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "40px",
                padding: "32px", border: `1px solid ${colors.border}`, borderRadius: "12px",
                backgroundColor: colors.bgCard
            }}>
                <div style={{
                    width: "80px", height: "80px", borderRadius: "40px",
                    backgroundColor: "var(--bg-hover)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    border: `1px solid ${colors.border}`
                }}>
                    <User style={{ width: "32px", height: "32px", color: "var(--text-primary)" }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <h1 style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                                {displayName}
                            </h1>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-muted)", fontSize: "14px" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Mail style={{ width: "14px", height: "14px" }} /> {email}
                                </span>
                                {email_domain && (
                                    <span style={{
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                        backgroundColor: "rgba(59,130,246,0.12)",
                                        border: `1px solid ${colors.border}`,
                                        color: "var(--text-primary)"
                                    }}>
                                        {email_domain}
                                    </span>
                                )}
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Calendar style={{ width: "14px", height: "14px" }} /> Added {new Date(created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button
                                onClick={() => {
                                    if (isEditing) {
                                        setDraftEmail(contact.email || "");
                                        setDraftCustomFields(contact.custom_fields || {});
                                        setIsEditing(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    border: `1px solid ${colors.border}`,
                                    background: isEditing ? colors.bgHover : "transparent",
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 600
                                }}
                            >
                                {isEditing ? "Cancel" : "Edit Contact"}
                            </button>
                            <div style={{
                                padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textTransform: "capitalize",
                                backgroundColor: status === 'subscribed' ? `${colors.statusSuccess}20` : `${colors.statusError}20`,
                                color: status === 'subscribed' ? colors.statusSuccess : colors.statusError,
                                display: "flex", alignItems: "center", gap: "6px"
                            }}>
                                {status === 'subscribed' ? <UserCheck style={{ width: "14px", height: "14px" }} /> : <ListCollapse style={{ width: "14px", height: "14px" }} />}
                                {status}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                {/* Details Column */}
                <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", borderBottom: `1px solid ${colors.border}`, paddingBottom: "12px" }}>
                        Contact Information
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Email</span>
                            {isEditing ? (
                                <input
                                    value={draftEmail}
                                    onChange={(e) => setDraftEmail(e.target.value)}
                                    style={{
                                        padding: "8px 10px",
                                        fontSize: "14px",
                                        backgroundColor: "var(--bg-primary)",
                                        color: "var(--text-primary)",
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "6px"
                                    }}
                                />
                            ) : (
                                <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>{email}</span>
                            )}
                        </div>
                        {first_name && (
                            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                                <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>First Name</span>
                                <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>{first_name}</span>
                            </div>
                        )}
                        {last_name && (
                            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                                <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Last Name</span>
                                <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>{last_name}</span>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {custom_fields && Object.keys(custom_fields).length > 0 && (
                            <>
                                <div style={{ height: "1px", backgroundColor: colors.border, margin: "8px 0" }} />
                                {Object.entries(isEditing ? draftCustomFields : (custom_fields || {})).map(([key, value]) => (
                                    <div key={key} style={{ display: "grid", gridTemplateColumns: isEditing ? "120px 1fr" : "120px 1fr", gap: "10px" }}>
                                        {isEditing ? (
                                            <input
                                                value={key}
                                                onChange={(e) => handleCustomFieldRename(key, e.target.value.trim().replace(/\s+/g, "_").toLowerCase())}
                                                style={{
                                                    padding: "8px 10px",
                                                    fontSize: "13px",
                                                    backgroundColor: "var(--bg-primary)",
                                                    color: "var(--text-primary)",
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: "6px",
                                                    textTransform: "none"
                                                }}
                                            />
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: "14px", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                                        )}
                                        {isEditing ? (
                                            <input
                                                value={String(value ?? "")}
                                                onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                                                style={{
                                                    padding: "8px 10px",
                                                    fontSize: "13px",
                                                    backgroundColor: "var(--bg-primary)",
                                                    color: "var(--text-primary)",
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: "6px"
                                                }}
                                            />
                                        ) : (
                                            <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>{value as string}</span>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                        {isEditing && (
                            <div style={{ display: "flex", gap: "10px", paddingTop: "10px" }}>
                                <button
                                    onClick={handleAddCustomField}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        border: `1px solid ${colors.border}`,
                                        background: "transparent",
                                        color: "var(--text-primary)",
                                        cursor: "pointer"
                                    }}
                                >
                                    Add Custom Field
                                </button>
                                <button
                                    onClick={handleSaveContact}
                                    disabled={savingProfile}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "var(--accent)",
                                        color: "white",
                                        cursor: savingProfile ? "wait" : "pointer",
                                        opacity: savingProfile ? 0.7 : 1
                                    }}
                                >
                                    {savingProfile ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags Column */}
                <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", borderBottom: `1px solid ${colors.border}`, paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Tag style={{ width: "16px", height: "16px" }} />
                        Tags
                    </h3>

                    {/* Tag List */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                        {tags && tags.length > 0 ? (
                            tags.map(tag => (
                                <span key={tag} style={{
                                    display: "flex", alignItems: "center", gap: "6px",
                                    padding: "4px 10px", fontSize: "13px", color: "var(--text-primary)",
                                    backgroundColor: colors.bgHover, border: `1px solid ${colors.border}`, borderRadius: "16px"
                                }}>
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        disabled={updatingTags}
                                        style={{
                                            background: "none", border: "none", padding: "0", display: "flex", alignItems: "center",
                                            cursor: updatingTags ? "not-allowed" : "pointer", color: "var(--text-muted)", opacity: updatingTags ? 0.5 : 1
                                        }}
                                    >
                                        <X style={{ width: "12px", height: "12px" }} />
                                    </button>
                                </span>
                            ))
                        ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>No tags added yet.</span>
                        )}
                    </div>

                    {/* Add Tag Input */}
                    <div style={{ display: "flex", gap: "8px" }}>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                            placeholder="Add a new tag..."
                            disabled={updatingTags}
                            style={{
                                flex: 1, padding: "8px 12px", fontSize: "14px",
                                backgroundColor: "var(--bg-primary)", color: "var(--text-primary)",
                                border: `1px solid ${colors.border}`, borderRadius: "6px",
                                outline: "none"
                            }}
                        />
                        <button
                            onClick={handleAddTag}
                            disabled={!tagInput.trim() || updatingTags}
                            style={{
                                padding: "8px 16px", backgroundColor: "var(--accent)", color: "white",
                                border: "none", borderRadius: "6px", cursor: (!tagInput.trim() || updatingTags) ? "not-allowed" : "pointer",
                                opacity: (!tagInput.trim() || updatingTags) ? 0.5 : 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", fontWeight: 500
                            }}
                        >
                            <Plus style={{ width: "16px", height: "16px" }} /> Add
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
