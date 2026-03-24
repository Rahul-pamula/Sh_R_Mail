"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    Type, ImageIcon, Square, Minus, Layout, Loader2, ArrowLeft,
    GripVertical, Save, Plus, Undo2, Redo2, Eye,
    Share2, Settings2, Monitor, Smartphone, Layers, Blocks,
    Trash2, Copy, ChevronDown, Shapes, Youtube, MessageCircle, ChevronLeft,
    Facebook, Instagram, Twitter, Linkedin, Search, X, Star, Clock, Terminal
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import EditorCanvas from "./EditorCanvas";
import {
    DesignJSON, DesignBlock, BlockType,
    SelectedNode, DEFAULT_THEME, BLOCK_DEFAULTS, uid, clone,
} from "./types";
import ImageUploadModal from "./ImageUploadModal";
import { TEMPLATE_PRESETS, TemplatePreset } from "./templates_library";

// ── BLOCK ICONS ────────────────────────────────────────────────────────────
const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
    text: <Type size={20} />, image: <ImageIcon size={20} />, button: <Square size={20} />,
    divider: <Minus size={20} />, spacer: <Layout size={20} opacity={.4} />,
    social: <Share2 size={20} />, hero: <Monitor size={20} />, footer: <Settings2 size={20} />,
    shape: <Shapes size={20} />, line: <Minus size={20} style={{ transform: "rotate(-45deg)" }} />,
    "floating-text": <Layers size={20} />,
    "floating-image": <ImageIcon size={20} />,
    layout: <Layout size={20} />,
    rating: <Star size={20} />,
    countdown: <Clock size={20} />,
    html: <Terminal size={20} />,
};

// ── HELPER COMPONENTS & STYLES ─────────────────────────────────────────────
const iconBtn: React.CSSProperties = { width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 10, background: "none", cursor: "pointer", transition: "all 0.15s ease" };

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2E8F0",
    background: "#F8FAFC", color: "#0F172A", fontSize: 13, outline: "none",
    transition: "all 0.15s ease", boxSizing: "border-box", fontWeight: 500,
};

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, ...style }}>{children}</div>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #E2E8F0" }}>{title}</div>
            {children}
        </div>
    );
}

function FormGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ marginBottom: 24, ...style }}>{children}</div>;
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, ...style }}>{children}</div>;
}

const COMMON_ICONS = ["Type", "Image", "Square", "Minus", "Layout", "Share2", "Facebook", "Instagram", "Twitter", "Linkedin", "Youtube", "MessageCircle", "Shapes", "Eye", "Save", "Trash2", "Copy", "History", "Settings", "Search", "X", "Check", "Info", "AlertCircle", "Bell", "Calendar", "Mail", "Phone", "Video", "MapPin", "Gift", "Star", "Heart", "Smile", "ThumbsUp", "Clock", "Download", "ExternalLink", "Globe", "HelpCircle", "Lock", "Unlock", "Maximize", "Minimize", "Menu", "MoreHorizontal", "MoreVertical", "Play", "Pause", "RefreshCw", "RotateCcw", "Send", "Tag", "Terminal", "User", "Users", "Briefcase", "Home", "Trophy", "Award", "Music", "Mic", "Camera", "Smartphone", "Monitor", "Coffee", "ShoppingCart", "FastForward", "Rewind"];

function TabsContainer({ children }: { children: React.ReactNode }) {
    return <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>{children}</div>;
}

function Tab({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
    return <button onClick={onClick} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #E2E8F0", background: active ? "#6366F1" : "#fff", color: active ? "#fff" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
}

// ── HELPER: CLEAN URL OPENING ──────────────────────────────────────────────
const cleanOpen = (url: string) => {
    const u = (url || "").trim().replace(/^#/, "");
    if (!u || u === "") return;
    if (typeof window !== "undefined") {
        window.open(u.startsWith("http") ? u : `https://${u}`, "_blank");
    }
};

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function PremiumEmailBuilder() {
    const params = useParams();
    const router = useRouter();
    const { token, isLoading: authLoading } = useAuth();
    const templateId = params.id as string;

    const [name, setName] = useState("Untitled Template");
    const [subject, setSubject] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [design, setDesign] = useState<DesignJSON>({ theme: DEFAULT_THEME, headerBlocks: [], bodyBlocks: [], footerBlocks: [] });
    const [history, setHistory] = useState<DesignJSON[]>([]);
    const [future, setFuture] = useState<DesignJSON[]>([]);
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
    const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [leftTab, setLeftTab] = useState<"blocks" | "templates">("blocks");
    const [showElements, setShowElements] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<"content" | "style" | "settings">("content");
    const [showPreview, setShowPreview] = useState(false);
    const [compiledHtml, setCompiledHtml] = useState("");
    const [pendingImageCol, setPendingImageCol] = useState<string | null>(null);
    const [activeSubMenu, setActiveSubMenu] = useState<"social" | "icons" | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [photoSearch, setPhotoSearch] = useState("");
    const [iconSearch, setIconSearch] = useState("");

    const pushDesign = useCallback((modifier: (d: DesignJSON) => DesignJSON) => {
        setDesign((prev) => {
            const next = modifier(clone(prev));
            setHistory((h) => [...h, clone(prev)].slice(-20));
            setFuture([]);
            return next;
        });
    }, []);

    const undo = () => { if (!history.length) return; setFuture((f) => [clone(design), ...f]); setDesign(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); };
    const redo = () => { if (!future.length) return; setHistory((h) => [...h, clone(design)]); setDesign(future[0]); setFuture((f) => f.slice(1)); };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isEditing = target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName);

            if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                if (isEditing) return; // Allow native undo while typing
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [design, history, future]);

    const compileForPreview = () => {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        fetch(`${API}/templates/compile/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design_json: design }) })
            .then(r => r.json()).then(d => { if (d.html) { setCompiledHtml(d.html); setShowPreview(true); } });
    };

    useEffect(() => {
        if (authLoading || !token) return;
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        fetch(`${API}/templates/${templateId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                if (res.status === 401) {
                    alert("Unauthorized (401). Your session may have expired. Please log in again.");
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return;
                setName(data.name || "Untitled");
                setSubject(data.subject || "");
                if (data.design_json) {
                    const d = data.design_json;
                    // Migration: support old templates that had rows/columns
                    const migrate = (rows: any[] = []) => {
                        const blocks: DesignBlock[] = [];
                        rows.forEach(r => r.columns?.forEach((c: any) => c.blocks?.forEach((b: any) => blocks.push(b))));
                        return blocks;
                    };

                    if (d.headerBlocks || d.bodyBlocks || d.footerBlocks) {
                        setDesign({
                            theme: d.theme || DEFAULT_THEME,
                            headerBlocks: d.headerBlocks || [],
                            bodyBlocks: d.bodyBlocks || [],
                            footerBlocks: d.footerBlocks || []
                        });
                    } else if (d.headerRows || d.bodyRows || d.footerRows) {
                        setDesign({
                            theme: d.theme || DEFAULT_THEME,
                            headerBlocks: migrate(d.headerRows),
                            bodyBlocks: migrate(d.bodyRows),
                            footerBlocks: migrate(d.footerRows)
                        });
                    } else if (d.rows) {
                        setDesign({ theme: d.theme || DEFAULT_THEME, headerBlocks: [], bodyBlocks: migrate(d.rows), footerBlocks: [] });
                    }
                }
                setLoading(false);
            }).catch(() => setLoading(false));
    }, [templateId]);

    const handleSave = async () => {
        if (!token) {
            alert("No authentication token found. Please log in again.");
            return;
        }
        setSaving(true);
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
            const res = await fetch(`${API}/templates/${templateId}`, {
                method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, subject, design_json: design, template_type: "block", schema_version: "2.0.0" }),
            });
            if (res.status === 401) {
                alert("Session expired (401). Please log in again to save your changes.");
                return;
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(`Error saving template: ${data.detail || "Unknown error"}`);
                return;
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Save error:", err);
            alert("Connection error. Could not save changes.");
        } finally { setSaving(false); }
    };

    const addBlockToZone = (zone: "header" | "body" | "footer", blockType: BlockType = "text", customProps?: any, destIndex?: number) => {
        if (blockType === "image" && !customProps?.src) {
            setPendingImageCol(zone);
            return;
        }
        const newBlockId = `blk-${uid()}`;
        const newBlock = { id: newBlockId, type: blockType, props: { ...BLOCK_DEFAULTS[blockType].defaults, ...customProps } };
        
        pushDesign(d => {
            const key = zone === "header" ? "headerBlocks" : zone === "footer" ? "footerBlocks" : "bodyBlocks";
            if (typeof destIndex === "number") {
                d[key].splice(destIndex, 0, newBlock);
            } else {
                d[key].push(newBlock);
            }
            return d;
        });

        // Auto-select for immediate typing
        setSelectedNode({ type: "block", id: newBlockId });
    };

    const moveBlock = (blockId: string, sourceZone: string, destZone: string, destIndex?: number) => {
        pushDesign(d => {
            const sKey = sourceZone === "header" ? "headerBlocks" : sourceZone === "footer" ? "footerBlocks" : "bodyBlocks";
            const dKey = destZone === "header" ? "headerBlocks" : destZone === "footer" ? "footerBlocks" : "bodyBlocks";
            
            const sourceIndex = d[sKey].findIndex(b => b.id === blockId);
            if (sourceIndex === -1) return d;

            const [moved] = d[sKey].splice(sourceIndex, 1);
            const finalDestIndex = typeof destIndex === "number" ? destIndex : d[dKey].length;
            d[dKey].splice(finalDestIndex, 0, moved);
            return d;
        });
    };

    const duplicateBlock = (blockId: string) => {
        pushDesign(d => {
            const zones = [d.headerBlocks, d.bodyBlocks, d.footerBlocks];
            for (const list of zones) {
                const idx = list.findIndex(b => b.id === blockId);
                if (idx !== -1) { list.splice(idx + 1, 0, { ...clone(list[idx]), id: `blk-${uid()}` }); break; }
            }
            return d;
        });
    };

    const deleteBlock = (blockId: string) => {
        pushDesign(d => {
            d.headerBlocks = d.headerBlocks.filter(b => b.id !== blockId);
            d.bodyBlocks = d.bodyBlocks.filter(b => b.id !== blockId);
            d.footerBlocks = d.footerBlocks.filter(b => b.id !== blockId);
            return d;
        });
        if (selectedNode?.id === blockId) setSelectedNode(null);
    };

    const loadTemplate = (preset: TemplatePreset) => {
        if (design.bodyBlocks.length > 0 || design.headerBlocks.length > 0 || design.footerBlocks.length > 0) {
            if (!confirm(`Are you sure you want to load the "${preset.name}" template? This will replace your current design.`)) {
                return;
            }
        }
        
        // Generate new IDs for all blocks in the template to avoid collisions 
        // if they load the same template multiple times or undo/redo
        const deepCloneWithNewIds = (blocks: DesignBlock[]) => {
            return blocks.map(b => ({ ...clone(b), id: `blk-${uid()}` }));
        };

        const t = preset.design;
        setDesign({
            theme: clone(t.theme || DEFAULT_THEME),
            headerBlocks: deepCloneWithNewIds(t.headerBlocks || []),
            bodyBlocks: deepCloneWithNewIds(t.bodyBlocks || []),
            footerBlocks: deepCloneWithNewIds(t.footerBlocks || [])
        });
        
        // Reset history on large template load to avoid memory spikes, or keep it? 
        // Canva usually allows Undo after template load.
        setHistory(h => [...h, clone(design)]); 
        setFuture([]);
    };

    const updateBlockProp = (blockId: string, key: string, val: any) => {
        pushDesign(d => {
            const allBlocks = [...d.headerBlocks, ...d.bodyBlocks, ...d.footerBlocks];
            const b = allBlocks.find(b => b.id === blockId);
            if (b) b.props[key] = val;
            return d;
        });
    };

    const mirrorExternalImage = async (url: string, blockId: string) => {
        if (!url || !url.startsWith("http") || url.includes("supabase.co") || url.includes("localhost:8000")) return;
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
            console.log("DEBUG: Mirroring external image:", url);
            const res = await fetch(`${API}/assets/mirror`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            if (res.ok) {
                const data = await res.json();
                console.log("DEBUG: Mirroring successful, new URL:", data.url);
                updateBlockProp(blockId, "src", data.url);
            }
        } catch (err) {
            console.error("Mirroring failed:", err);
        }
    };

    const mirrorTextAssets = async (text: string, blockId: string) => {
        if (!text) return;
        const urls = text.match(/https?:\/\/[^\s"'<>;)]+/g) || [];
        if (!urls.length) return;
        
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        let newWebText = text;
        let changed = false;

        for (const url of urls) {
            if (url.includes("supabase.co") || url.includes("localhost:8000")) continue;
            
            try {
                const res = await fetch(`${API}/assets/mirror`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                });
                if (res.ok) {
                    const data = await res.json();
                    newWebText = newWebText.split(url).join(data.url);
                    changed = true;
                }
            } catch (err) {
                console.error("Text asset mirroring failed:", url, err);
            }
        }
        
        if (changed) updateBlockProp(blockId, "content", newWebText);
    };

    const bulkUpdateBlock = (blockId: string, updates: Record<string, any>, newType?: BlockType) => {
        pushDesign(d => {
            const allBlocks = [...d.headerBlocks, ...d.bodyBlocks, ...d.footerBlocks];
            const b = allBlocks.find(b => b.id === blockId);
            if (b) {
                Object.assign(b.props, updates);
                if (newType) b.type = newType;
            }
            return d;
        });
    };


    const getSelected = () => {
        if (!selectedNode) return {};
        const allBlocks = [...design.headerBlocks, ...design.bodyBlocks, ...design.footerBlocks];
        const block = allBlocks.find(b => b.id === selectedNode.id);
        return block ? { block } : {};
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F8FAFC" }}>
            <Loader2 size={32} style={{ color: "#6366F1", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const sel = getSelected();

    const DraggableItem = ({ type, label, icon, props, children }: { type: BlockType; label?: string; icon?: React.ReactNode; props?: any; children?: React.ReactNode }) => (
        <div draggable onDragStart={e => {
            e.dataTransfer.setData("blockType", type);
            if (props) e.dataTransfer.setData("blockProps", JSON.stringify(props));
        }}
            className="block-card" style={{
                background: "#ffffff", borderRadius: 12, border: "1px solid #F1F5F9",
                cursor: "grab", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)", color: "#475569",
                overflow: "hidden"
            }}>
            {children ? children : (
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", color: "#6366F1",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>{icon}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#334155", textAlign: "left" }}>{label}</div>
                    <GripVertical size={14} style={{ color: "#CBD5E1" }} />
                </div>
            )}
        </div>
    );

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden" }}>
            {/* ════ TOP BAR ════ */}
            <div style={{
                height: 64, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between",
                padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #E2E8F0", flexShrink: 0, zIndex: 50,
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={() => router.push("/templates")} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E8F0", background: "#fff", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "8px 12px", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <ArrowLeft size={16} /> <span>Back</span>
                    </button>
                    <div style={{ width: 1, height: 24, background: "#E2E8F0" }} />
                    <input value={name} onChange={e => setName(e.target.value)} style={{ border: "none", fontSize: 16, fontWeight: 600, color: "#0F172A", outline: "none", background: "transparent", width: 300 }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                    {(["desktop", "mobile"] as const).map(m => (
                        <button key={m} onClick={() => setViewMode(m)} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                            background: viewMode === m ? "#fff" : "transparent", color: viewMode === m ? "#0F172A" : "#64748B",
                            boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s ease",
                        }}>{m === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />} {m.charAt(0).toUpperCase() + m.slice(1)}</button>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={undo} disabled={!history.length} style={{ ...iconBtn, color: history.length ? "#64748B" : "#CBD5E1" }}><Undo2 size={18} /></button>
                    <button onClick={redo} disabled={!future.length} style={{ ...iconBtn, color: history.length ? "#64748B" : "#CBD5E1" }}><Redo2 size={18} /></button>
                    <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 8px" }} />
                    <button onClick={compileForPreview} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}><Eye size={16} /> Preview</button>
                    <button onClick={handleSave} disabled={saving} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", border: "none", borderRadius: 10,
                        background: "#6366F1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                        opacity: saving ? 0.8 : 1, transition: "all 0.15s ease", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                    }}>
                        <Save size={16} /> {saving ? "Saving…" : saveSuccess ? "Changes Saved!" : "Save Changes"}
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* ════ LEFT SIDEBAR ════ */}
                <div style={{ width: 280, background: "#ffffff", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 8px rgba(0,0,0,0.02)", zIndex: 10 }}>
                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid #F1F5F9", padding: "8px 16px 0" }}>
                        {[
                            { key: "blocks", label: "Blocks", icon: <Blocks size={16} /> },
                            { key: "templates", label: "Library", icon: <Layout size={16} /> }
                        ].map(t => (
                            <button key={t.key} onClick={() => setLeftTab(t.key as any)} style={{
                                flex: 1, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 8, padding: "14px 0",
                                border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                                color: leftTab === t.key ? "#6366F1" : "#94A3B8",
                                borderBottom: leftTab === t.key ? "2px solid #6366F1" : "2px solid transparent", transition: "all 0.2s ease",
                            }}>{t.icon} {t.label}</button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
                        {/* ─── BLOCKS TAB ─── */}
                        {leftTab === "blocks" && (
                            <>
                                {activeSubMenu === "social" ? (
                                    <div style={{ padding: 12, animation: "fadeSlideUp 0.3s ease-out" }}>
                                        <button onClick={() => setActiveSubMenu(null)} style={{
                                            display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
                                            color: "#6366F1", cursor: "pointer", fontSize: 14, fontWeight: 700, marginBottom: 20, padding: 0
                                        }}><ChevronLeft size={18} /> Back</button>
                                        <SectionLabel>Social Platforms</SectionLabel>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                                            <DraggableItem type="social" label="Facebook" icon={<Facebook size={16} />} props={{ icons: [{ platform: "facebook", url: "#" }], align: "center" }} />
                                            <DraggableItem type="social" label="Instagram" icon={<Instagram size={16} />} props={{ icons: [{ platform: "instagram", url: "#" }], align: "center" }} />
                                            <DraggableItem type="social" label="Twitter" icon={<Twitter size={16} />} props={{ icons: [{ platform: "twitter", url: "#" }], align: "center" }} />
                                            <DraggableItem type="social" label="LinkedIn" icon={<Linkedin size={16} />} props={{ icons: [{ platform: "linkedin", url: "#" }], align: "center" }} />
                                            <DraggableItem type="social" label="YouTube" icon={<Youtube size={16} />} props={{ icons: [{ platform: "youtube", url: "#" }], align: "center" }} />
                                            <DraggableItem type="social" label="WhatsApp" icon={<MessageCircle size={16} />} props={{ icons: [{ platform: "whatsapp", url: "#" }], align: "center" }} />
                                        </div>
                                    </div>
                                ) : !showElements ? (
                                    <>
                                        <SectionLabel>Content Blocks</SectionLabel>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                                            {["text", "image", "button", "divider", "spacer", "hero", "footer", "layout"].map(type => (
                                                <DraggableItem key={type} type={type as BlockType} label={BLOCK_DEFAULTS[type as BlockType].label} icon={BLOCK_ICONS[type as BlockType]} />
                                            ))}
                                            
                                            <div onClick={() => setActiveSubMenu("social")} className="block-card" style={{
                                                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                                                borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                                                background: "#fff", border: "1px solid #F1F5F9", color: "#475569",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                                            }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Share2 size={16} color="#6366F1" />
                                                </div>
                                                <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>Social Media Icons</div>
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 24, marginBottom: 24 }}>
                                            <SectionLabel>Interactive & UI</SectionLabel>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                                                <DraggableItem type="rating" label="Star Rating" icon={<Star size={16} />} />
                                                <DraggableItem type="countdown" label="Countdown" icon={<Clock size={16} />} />
                                                <DraggableItem type="html" label="HTML Embed" icon={<Terminal size={16} />} />
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 12 }}>
                                            <SectionLabel>Creative Assets</SectionLabel>
                                            <div onClick={() => setShowElements(true)} className="block-card" style={{
                                                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                                                borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                                                background: "#fff", border: "1px solid #F1F5F9", color: "#475569",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                                            }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Shapes size={16} color="#6366F1" />
                                                </div>
                                                <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>Elements (Photos & Icons)</div>
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                            <button onClick={() => setShowElements(false)} style={{
                                                width: 32, height: 32, borderRadius: "50%", border: "none", background: "#F1F5F9",
                                                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B"
                                            }}>
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Integrated Assets</span>
                                        </div>
                                        
                                        <TabsContainer>
                                            <Tab active={!activeSubMenu} onClick={() => setActiveSubMenu(null)}>Photos</Tab>
                                            <Tab active={activeSubMenu === "icons"} onClick={() => setActiveSubMenu("icons")}>Icons</Tab>
                                        </TabsContainer>

                                        {!activeSubMenu ? (
                                            <>
                                                <div style={{ position: "relative", marginBottom: 16 }}>
                                                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                                                    <input placeholder="Search stock photos..." onKeyDown={e => e.key === "Enter" && setPhotoSearch((e.target as any).value)} style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, outline: "none" }} />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                    {(photoSearch ? Array(8).fill(0) : ["business", "nature", "tech", "work", "minimal", "startup"]).map((kw, i) => {
                                                        const url = `https://images.unsplash.com/photo-${1500000000000 + (i * 100000)}?w=300&h=200&fit=crop&q=80&sig=${photoSearch || kw}-${i}`;
                                                        return (
                                                            <div key={i} draggable onDragStart={e => { e.dataTransfer.setData("blockType", "image"); e.dataTransfer.setData("blockProps", JSON.stringify({ src: url, borderRadius: 8 })); }} style={{ height: 80, borderRadius: 8, backgroundImage: `url(${url})`, backgroundSize: "cover", cursor: "grab", border: "1px solid #E2E8F0" }} />
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ position: "relative", marginBottom: 16 }}>
                                                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                                                    <input placeholder="Search icons..." onChange={e => setIconSearch(e.target.value)} style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, outline: "none" }} />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                                    {COMMON_ICONS.filter(n => n.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 32).map(name => {
                                                        const kebabName = name.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();
                                                        const iconUrl = `https://api.iconify.design/lucide/${kebabName}.svg?color=%236366F1`;
                                                        return (
                                                            <div key={name} draggable onDragStart={e => { e.dataTransfer.setData("blockType", "image"); e.dataTransfer.setData("blockProps", JSON.stringify({ src: iconUrl, width: 20, align: "center" })); }} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9", cursor: "grab" }}>
                                                                <img src={iconUrl} style={{ width: 20, height: 20 }} alt={name} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ─── TEMPLATES TAB ─── */}
                        {leftTab === "templates" && (
                            <div style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
                                <SectionLabel>Premium Designs</SectionLabel>
                                <div style={{ position: "relative", marginBottom: 20 }}>
                                    <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                                    <input 
                                        placeholder="Search templates..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12, border: "1px solid #E2E8F0",
                                            fontSize: 13, outline: "none", background: "#F8FAFC"
                                        }}
                                    />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                                    {TEMPLATE_PRESETS
                                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .slice(0, 15)
                                        .map((preset) => (
                                            <div key={preset.id} onClick={() => loadTemplate(preset)} className="block-card" style={{ padding: "12px", background: "#ffffff", borderRadius: 16, border: "1px solid #F1F5F9", cursor: "pointer", transition: "all 0.2s ease" }}>
                                                <div style={{ width: "100%", height: 110, borderRadius: 10, marginBottom: 12, backgroundImage: `url(${preset.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9" }} />
                                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{preset.name}</div>
                                                <div style={{ fontSize: 11, color: "#64748B", lineHeight: "1.4" }}>{preset.description}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* ─── LAYERS TAB ─── */}
                    </div>
                </div>

                {/* ════ CANVAS ════ */}
                <EditorCanvas
                    design={design}
                    selectedNode={selectedNode}
                    hoveredBlock={hoveredBlock}
                    viewMode={viewMode}
                    onSelectNode={setSelectedNode}
                    onHoverBlock={setHoveredBlock}
                    onLeaveBlock={() => setHoveredBlock(null)}
                    onUpdateBlockProp={updateBlockProp}
                    onBulkUpdateBlock={bulkUpdateBlock}
                    onAddBlockToZone={addBlockToZone}
                    onMoveBlock={moveBlock}
                    onDuplicateBlock={duplicateBlock}
                    onDeleteBlock={deleteBlock}
                />

                {/* ════ RIGHT INSPECTOR ════ */}
                <div style={{ width: 340, background: "#ffffff", borderLeft: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "-2px 0 8px rgba(0,0,0,0.02)", zIndex: 10 }}>
                    <div style={{ display: "flex", borderBottom: "1px solid #F1F5F9", padding: "8px 16px 0" }}>
                        {(["content", "style", "settings"] as const).map(t => (
                            <button key={t} onClick={() => setInspectorTab(t)} style={{
                                flex: 1, padding: "14px 0", border: "none", background: "none", cursor: "pointer",
                                fontSize: 13, fontWeight: 600, color: inspectorTab === t ? "#6366F1" : "#94A3B8",
                                borderBottom: inspectorTab === t ? "2px solid #6366F1" : "2px solid transparent", transition: "all 0.2s ease", textTransform: "capitalize",
                            }}>{t}</button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                        {!selectedNode && (
                            <div style={{ textAlign: "center", padding: "64px 24px" }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                    <Settings2 size={24} color="#94A3B8" />
                                </div>
                                <p style={{ fontSize: 15, color: "#334155", fontWeight: 600 }}>Select a block to style</p>
                                <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 8, lineHeight: 1.5 }}>Click on any block on the canvas or in the layers tab to adjust properties.</p>
                            </div>
                        )}

                        {inspectorTab === "content" && selectedNode?.type === "block" && sel.block && (
                            <InspectorSection title={BLOCK_DEFAULTS[sel.block.type]?.label || "Block Content"}>
                                {sel.block.type === "text" && (
                                    <>
                                        <FormGroup>
                                            <Label>Content</Label>
                                            <textarea value={sel.block.props.content || ""} 
                                                onChange={e => updateBlockProp(sel.block!.id, "content", e.target.value)}
                                                onBlur={e => mirrorTextAssets(e.target.value, sel.block!.id)}
                                                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Block Link (Double-click to open)</Label>
                                            <input value={sel.block.props.linkUrl || ""} onChange={e => updateBlockProp(sel.block!.id, "linkUrl", e.target.value)} style={inputStyle} placeholder="https://..." />
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "image" && (
                                    <>
                                        <FormGroup>
                                            <Label>Image URL</Label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input value={sel.block.props.src || ""} 
                                                    onChange={e => updateBlockProp(sel.block!.id, "src", e.target.value)}
                                                    onBlur={e => mirrorExternalImage(e.target.value, sel.block!.id)}
                                                    style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
                                                <button onClick={() => setPendingImageCol(sel.block!.id)} style={{
                                                    padding: "0 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#6366F1"
                                                }} title="Upload Image"><Plus size={18} /></button>
                                            </div>
                                            {sel.block.props.src && <img src={sel.block.props.src} alt="" style={{ width: "100%", borderRadius: 10, marginTop: 12, border: "1px solid #E2E8F0" }} />}
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Alt Text</Label>
                                            <input value={sel.block.props.alt || ""} onChange={e => updateBlockProp(sel.block!.id, "alt", e.target.value)} style={inputStyle} />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Link URL</Label>
                                            <input value={sel.block.props.linkUrl || ""} onChange={e => updateBlockProp(sel.block!.id, "linkUrl", e.target.value)} style={inputStyle} placeholder="https://..." />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Image Width</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={10} max={100} value={parseInt(sel.block.props.width) || 100} onChange={e => updateBlockProp(sel.block!.id, "width", `${e.target.value}%`)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.width || "100%"}</span>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "button" && (
                                    <>
                                        <FormGroup><Label>Button Text</Label><input value={sel.block.props.text || ""} onChange={e => updateBlockProp(sel.block!.id, "text", e.target.value)} style={inputStyle} /></FormGroup>
                                        <FormGroup><Label>Link URL</Label><input value={sel.block.props.url || ""} onChange={e => updateBlockProp(sel.block!.id, "url", e.target.value)} style={inputStyle} placeholder="https://..." /></FormGroup>
                                    </>
                                )}
                                {sel.block.type === "spacer" && (
                                    <FormGroup><Label>Height</Label>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <input type="range" min={8} max={120} value={sel.block.props.height || 32} onChange={e => updateBlockProp(sel.block!.id, "height", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.height || 32}px</span>
                                        </div>
                                    </FormGroup>
                                )}
                                {sel.block.type === "hero" && (
                                    <>
                                        <FormGroup><Label>Headline</Label><input value={sel.block.props.headline || ""} onChange={e => updateBlockProp(sel.block!.id, "headline", e.target.value)} style={inputStyle} /></FormGroup>
                                        <FormGroup><Label>Subheadline</Label><input value={sel.block.props.subheadline || ""} onChange={e => updateBlockProp(sel.block!.id, "subheadline", e.target.value)} style={inputStyle} /></FormGroup>
                                        <FormGroup><Label>Button Text (Optional)</Label><input value={sel.block.props.btnText || ""} onChange={e => updateBlockProp(sel.block!.id, "btnText", e.target.value)} style={inputStyle} /></FormGroup>
                                        <FormGroup><Label>Button URL</Label><input value={sel.block.props.btnUrl || ""} onChange={e => updateBlockProp(sel.block!.id, "btnUrl", e.target.value)} style={inputStyle} /></FormGroup>
                                    </>
                                )}
                                {sel.block.type === "divider" && (
                                    <FormGroup><Label>Thickness</Label>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <input type="range" min={1} max={10} value={sel.block.props.thickness || 1} onChange={e => updateBlockProp(sel.block!.id, "thickness", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.thickness || 1}px</span>
                                        </div>
                                    </FormGroup>
                                )}
                                {sel.block.type === "social" && (
                                    <>
                                        <SectionLabel>Profiles</SectionLabel>
                                        {(sel.block.props.icons || []).map((icon: any, i: number) => (
                                            <FormGroup key={i}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                                    <Label style={{ margin: 0, textTransform: "capitalize" }}>{icon.platform}</Label>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <button onClick={() => cleanOpen(icon.url)} style={{
                                                            border: "none", background: "#F1F5F9", color: "#6366F1", padding: "4px 8px",
                                                            borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700
                                                        }}>Test</button>
                                                        <button onClick={() => {
                                                            const newIcons = [...sel.block!.props.icons];
                                                            newIcons.splice(i, 1);
                                                            updateBlockProp(sel.block!.id, "icons", newIcons);
                                                        }} style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>Remove</button>
                                                    </div>
                                                </div>
                                                <input value={icon.url || ""} onChange={e => {
                                                    const newIcons = [...sel.block!.props.icons];
                                                    newIcons[i] = { ...newIcons[i], url: e.target.value };
                                                    updateBlockProp(sel.block!.id, "icons", newIcons);
                                                }} style={inputStyle} placeholder="https://..." />
                                            </FormGroup>
                                        ))}
                                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                            {["facebook", "instagram", "twitter", "linkedin", "youtube", "whatsapp"].filter(p => !sel.block!.props.icons?.some((i: any) => i.platform === p)).map(p => (
                                                <button key={p} onClick={() => {
                                                    const newIcons = [...(sel.block!.props.icons || []), { platform: p, url: "" }];
                                                    updateBlockProp(sel.block!.id, "icons", newIcons);
                                                }} style={{
                                                    flex: 1, padding: "8px", border: "1px dashed #E2E8F0", borderRadius: 8,
                                                    background: "#F8FAFC", color: "#64748B", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                                    textTransform: "capitalize"
                                                }}>+ {p}</button>
                                            ))}
                                        </div>
                                        <FormGroup style={{ marginTop: 24 }}>
                                            <Label>Alignment</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {["left", "center", "right"].map(a => (
                                                    <button key={a} onClick={() => updateBlockProp(sel.block!.id, "align", a)} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                                                        background: sel.block!.props.align === a ? "#fff" : "transparent", color: sel.block!.props.align === a ? "#6366F1" : "#64748B",
                                                        boxShadow: sel.block!.props.align === a ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                                    }}>{a}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "footer" && (
                                    <FormGroup><Label>Footer Content</Label>
                                        <textarea value={sel.block.props.content || ""} onChange={e => updateBlockProp(sel.block!.id, "content", e.target.value)}
                                            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                                    </FormGroup>
                                )}
                                {sel.block.type === "shape" && (
                                    <>
                                        <FormGroup>
                                            <Label>Shape Type</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {["rect", "circle", "triangle"].map(t => (
                                                    <button key={t} onClick={() => updateBlockProp(sel.block!.id, "shapeType", t)} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                                                        background: sel.block!.props.shapeType === t ? "#fff" : "transparent", color: sel.block!.props.shapeType === t ? "#6366F1" : "#64748B",
                                                        boxShadow: sel.block!.props.shapeType === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                                    }}>{t}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Dimensions</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Width</Label><input type="number" value={sel.block.props.width || 100} onChange={e => updateBlockProp(sel.block!.id, "width", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Height</Label><input type="number" value={sel.block.props.height || 100} onChange={e => updateBlockProp(sel.block!.id, "height", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "line" && (
                                    <>
                                        <FormGroup>
                                            <Label>Line Style</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {["solid", "dashed", "dotted"].map(t => (
                                                    <button key={t} onClick={() => updateBlockProp(sel.block!.id, "lineType", t)} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                                                        background: sel.block!.props.lineType === t ? "#fff" : "transparent", color: sel.block!.props.lineType === t ? "#6366F1" : "#64748B",
                                                    }}>{t}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Thickness</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={1} max={20} value={sel.block.props.thickness || 2} onChange={e => updateBlockProp(sel.block!.id, "thickness", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.thickness || 2}px</span>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "floating-text" && (
                                    <>
                                        <FormGroup>
                                            <Label>Content</Label>
                                            <textarea value={sel.block.props.content || ""} 
                                                onChange={e => updateBlockProp(sel.block!.id, "content", e.target.value)}
                                                onBlur={e => mirrorTextAssets(e.target.value, sel.block!.id)}
                                                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Position (X, Y)</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>X</Label><input type="number" value={sel.block.props.x || 0} onChange={e => updateBlockProp(sel.block!.id, "x", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Y</Label><input type="number" value={sel.block.props.y || 0} onChange={e => updateBlockProp(sel.block!.id, "y", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Dimensions</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Width</Label><input type="number" value={sel.block.props.width || 200} onChange={e => updateBlockProp(sel.block!.id, "width", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Padding</Label><input type="number" value={sel.block.props.padding || 12} onChange={e => updateBlockProp(sel.block!.id, "padding", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "floating-image" && (
                                    <>
                                        <FormGroup>
                                            <Label>Image Source</Label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input value={sel.block.props.src || ""} 
                                                    onChange={e => updateBlockProp(sel.block!.id, "src", e.target.value)}
                                                    onBlur={e => mirrorExternalImage(e.target.value, sel.block!.id)}
                                                    style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
                                                <button onClick={() => setPendingImageCol(sel.block!.id)} style={{
                                                    padding: "0 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#6366F1"
                                                }} title="Upload Image"><Plus size={18} /></button>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Alt Text & Link</Label>
                                            <input value={sel.block.props.alt || ""} onChange={e => updateBlockProp(sel.block!.id, "alt", e.target.value)}
                                                style={{ ...inputStyle, marginBottom: 8 }} placeholder="Alt Text" />
                                            <input value={sel.block.props.linkUrl || ""} onChange={e => updateBlockProp(sel.block!.id, "linkUrl", e.target.value)}
                                                style={inputStyle} placeholder="Link URL (Optional)" />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Position (X, Y)</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>X</Label><input type="number" value={sel.block.props.x || 0} onChange={e => updateBlockProp(sel.block!.id, "x", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Y</Label><input type="number" value={sel.block.props.y || 0} onChange={e => updateBlockProp(sel.block!.id, "y", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Dimensions</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Width</Label><input type="number" value={sel.block.props.width || 200} onChange={e => updateBlockProp(sel.block!.id, "width", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Padding</Label><input type="number" value={sel.block.props.padding || 0} onChange={e => updateBlockProp(sel.block!.id, "padding", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "layout" && (
                                    <>
                                        <FormGroup>
                                            <Label>Column Layout</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {[
                                                    { id: "1-col", label: "1 Col", cols: 1 },
                                                    { id: "2-col", label: "2 Col", cols: 2 },
                                                    { id: "3-col", label: "3 Col", cols: 3 },
                                                ].map(l => (
                                                    <button key={l.id} onClick={() => {
                                                        const newCols = Array.from({ length: l.cols }, (_, i) => sel.block!.props.columns[i] || { blocks: [] });
                                                        updateBlockProp(sel.block!.id, "layoutType", l.id);
                                                        updateBlockProp(sel.block!.id, "columns", newCols);
                                                    }} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700,
                                                        background: sel.block!.props.layoutType === l.id ? "#fff" : "transparent", color: sel.block!.props.layoutType === l.id ? "#6366F1" : "#64748B",
                                                        boxShadow: sel.block!.props.layoutType === l.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                                    }}>{l.label}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Spacing & Padding</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Gap</Label><input type="number" value={sel.block.props.gap || 20} onChange={e => updateBlockProp(sel.block!.id, "gap", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 1 }}><Label>Padding</Label><input type="number" value={sel.block.props.padding || 20} onChange={e => updateBlockProp(sel.block!.id, "padding", +e.target.value)} style={inputStyle} /></div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #F1F5F9" }}>
                                    <FormGroup>
                                        <Label>Visibility</Label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                                            <input type="checkbox" checked={!!sel.block!.props.hideOnMobile} onChange={e => updateBlockProp(sel.block!.id, "hideOnMobile", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#6366F1" }} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Hide on Mobile Devices</span>
                                        </label>
                                    </FormGroup>
                                </div>
                                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F1F5F9" }}>
                                    <button onClick={() => deleteBlock(sel.block!.id)} style={{
                                        width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #FEE2E2",
                                        background: "#FEF2F2", color: "#EF4444", fontSize: 13, fontWeight: 700,
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                        transition: "all 0.2s"
                                    }}>
                                        <Trash2 size={16} /> Delete Block
                                    </button>
                                </div>
                            </InspectorSection>
                        )}

                        {inspectorTab === "style" && selectedNode?.type === "block" && sel.block && (
                            <InspectorSection title="Design Values">
                                {["text", "button", "hero"].includes(sel.block.type) && (
                                    <>
                                        <FormGroup>
                                            <Label>Font Size</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={10} max={72} value={sel.block.props.fontSize || 16} onChange={e => updateBlockProp(sel.block!.id, "fontSize", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.fontSize || 16}px</span>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Text Color</Label>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                    <input type="color" value={sel.block.props.color || "#000000"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                                </div>
                                                <input value={sel.block.props.color || "#000000"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Alignment</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {["left", "center", "right"].map(a => (
                                                    <button key={a} onClick={() => updateBlockProp(sel.block!.id, "align", a)} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                                                        background: sel.block!.props.align === a ? "#fff" : "transparent", color: sel.block!.props.align === a ? "#6366F1" : "#64748B",
                                                        boxShadow: sel.block!.props.align === a ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s ease",
                                                    }}>{a}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "button" && (
                                    <>
                                        <FormGroup>
                                            <Label>Button Color</Label>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                    <input type="color" value={sel.block.props.backgroundColor || "#6366F1"} onChange={e => updateBlockProp(sel.block!.id, "backgroundColor", e.target.value)} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                                </div>
                                                <input value={sel.block.props.backgroundColor || "#6366F1"} onChange={e => updateBlockProp(sel.block!.id, "backgroundColor", e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Border Radius</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={0} max={40} value={sel.block.props.borderRadius || 8} onChange={e => updateBlockProp(sel.block!.id, "borderRadius", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.borderRadius || 8}px</span>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {(sel.block.type === "shape" || sel.block.type === "line") && (
                                    <>
                                        <FormGroup>
                                            <Label>{sel.block.type === "shape" ? "Shape Color" : "Line Color"}</Label>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                    <input type="color" value={sel.block.props.backgroundColor || sel.block.props.color || "#6366F1"} 
                                                        onChange={e => updateBlockProp(sel.block!.id, sel.block!.type === "shape" ? "backgroundColor" : "color", e.target.value)} 
                                                        style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                                </div>
                                                <input value={sel.block.props.backgroundColor || sel.block.props.color || "#6366F1"} 
                                                    onChange={e => updateBlockProp(sel.block!.id, sel.block!.type === "shape" ? "backgroundColor" : "color", e.target.value)} 
                                                    style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Alignment</Label>
                                            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                                {["left", "center", "right"].map(a => (
                                                    <button key={a} onClick={() => updateBlockProp(sel.block!.id, "align", a)} style={{
                                                        flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                                                        background: sel.block!.props.align === a ? "#fff" : "transparent", color: sel.block!.props.align === a ? "#6366F1" : "#64748B",
                                                        boxShadow: sel.block!.props.align === a ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                                    }}>{a}</button>
                                                ))}
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "floating-text" && (
                                    <>
                                        <FormGroup>
                                            <Label>Font Size</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={10} max={72} value={sel.block.props.fontSize || 16} onChange={e => updateBlockProp(sel.block!.id, "fontSize", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.fontSize || 16}px</span>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Text Color</Label>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                    <input type="color" value={sel.block.props.color || "#374151"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                                </div>
                                                <input value={sel.block.props.color || "#374151"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Background Color</Label>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                    <input type="color" value={sel.block.props.backgroundColor || "#ffffff"} onChange={e => updateBlockProp(sel.block!.id, "backgroundColor", e.target.value)} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                                </div>
                                                <input value={sel.block.props.backgroundColor || "#ffffff"} onChange={e => updateBlockProp(sel.block!.id, "backgroundColor", e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Border</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Width</Label><input type="number" value={sel.block.props.borderWidth || 0} onChange={e => updateBlockProp(sel.block!.id, "borderWidth", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 2 }}><Label>Color</Label>
                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <input type="color" value={sel.block.props.borderColor || "#E2E8F0"} onChange={e => updateBlockProp(sel.block!.id, "borderColor", e.target.value)} style={{ width: 24, height: 24, padding: 0, border: "none", background: "none" }} />
                                                        <input value={sel.block.props.borderColor || "#E2E8F0"} onChange={e => updateBlockProp(sel.block!.id, "borderColor", e.target.value)} style={{ ...inputStyle, padding: "8px" }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "floating-image" && (
                                    <>
                                        <FormGroup>
                                            <Label>Border Radius</Label>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input type="range" min={0} max={100} value={sel.block.props.borderRadius || 0} onChange={e => updateBlockProp(sel.block!.id, "borderRadius", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.borderRadius || 0}px</span>
                                            </div>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Border Styling</Label>
                                            <div style={{ display: "flex", gap: 12 }}>
                                                <div style={{ flex: 1 }}><Label>Width</Label><input type="number" value={sel.block.props.borderWidth || 0} onChange={e => updateBlockProp(sel.block!.id, "borderWidth", +e.target.value)} style={inputStyle} /></div>
                                                <div style={{ flex: 2 }}><Label>Color</Label>
                                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                        <input type="color" value={sel.block.props.borderColor || "transparent"} onChange={e => updateBlockProp(sel.block!.id, "borderColor", e.target.value)} style={{ width: 24, height: 24, padding: 0, border: "none", background: "none" }} />
                                                        <input value={sel.block.props.borderColor || "transparent"} onChange={e => updateBlockProp(sel.block!.id, "borderColor", e.target.value)} style={{ ...inputStyle, padding: "8px" }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "divider" && (
                                    <FormGroup>
                                        <Label>Divider Color</Label>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                            <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                                <input type="color" value={sel.block.props.color || "#E5E7EB"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                            </div>
                                            <input value={sel.block.props.color || "#E5E7EB"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                        </div>
                                    </FormGroup>
                                )}
                                {sel.block.type === "footer" && (
                                    <FormGroup>
                                        <Label>Alignment</Label>
                                        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
                                            {["left", "center", "right"].map(a => (
                                                <button key={a} onClick={() => updateBlockProp(sel.block!.id, "align", a)} style={{
                                                    flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                                                    background: sel.block!.props.align === a ? "#fff" : "transparent", color: sel.block!.props.align === a ? "#6366F1" : "#64748B",
                                                    boxShadow: sel.block!.props.align === a ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                                }}>{a}</button>
                                            ))}
                                        </div>
                                    </FormGroup>
                                )}
                                {sel.block.type === "shape" && (
                                    <FormGroup>
                                        <Label>Border Width</Label>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <input type="range" min={0} max={20} value={sel.block.props.borderWidth || 0} onChange={e => updateBlockProp(sel.block!.id, "borderWidth", +e.target.value)} style={{ flex: 1, accentColor: "#6366F1" }} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{sel.block.props.borderWidth || 0}px</span>
                                        </div>
                                    </FormGroup>
                                )}
                                {sel.block.type === "rating" && (
                                    <>
                                        <FormGroup>
                                            <Label>Star Count</Label>
                                            <input type="number" min={1} max={10} value={sel.block.props.count || 5} onChange={e => updateBlockProp(sel.block!.id, "count", +e.target.value)} style={inputStyle} />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Star Color</Label>
                                            <input type="color" value={sel.block.props.color || "#FFD700"} onChange={e => updateBlockProp(sel.block!.id, "color", e.target.value)} style={{ ...inputStyle, height: 44, padding: 4 }} />
                                        </FormGroup>
                                    </>
                                )}
                                {sel.block.type === "countdown" && (
                                    <FormGroup>
                                        <Label>End Date/Time</Label>
                                        <input type="datetime-local" value={sel.block.props.endTime || ""} onChange={e => updateBlockProp(sel.block!.id, "endTime", e.target.value)} style={inputStyle} />
                                    </FormGroup>
                                )}
                                {sel.block.type === "html" && (
                                    <FormGroup>
                                        <Label>Custom MJML/HTML Code</Label>
                                        <textarea value={sel.block.props.content || ""} onChange={e => updateBlockProp(sel.block!.id, "content", e.target.value)}
                                            style={{ ...inputStyle, minHeight: 180, fontFamily: "monospace", fontSize: 12, resize: "vertical" }} />
                                    </FormGroup>
                                )}
                            </InspectorSection>
                        )}

                        {inspectorTab === "settings" && (
                            <InspectorSection title="Theme Preferences">
                                <FormGroup>
                                    <Label>Primary Brand Color</Label>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                            <input type="color" value={design.theme.primaryColor} onChange={e => pushDesign(d => { d.theme.primaryColor = e.target.value; return d; })} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                        </div>
                                        <input value={design.theme.primaryColor} onChange={e => pushDesign(d => { d.theme.primaryColor = e.target.value; return d; })} style={{ ...inputStyle, marginBottom: 0 }} />
                                    </div>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Default Text Color</Label>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                            <input type="color" value={design.theme.paragraphColor || "#475569"} onChange={e => pushDesign(d => { d.theme.paragraphColor = e.target.value; return d; })} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                        </div>
                                        <input value={design.theme.paragraphColor || "#475569"} onChange={e => pushDesign(d => { d.theme.paragraphColor = e.target.value; return d; })} style={{ ...inputStyle, marginBottom: 0 }} />
                                    </div>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Global Corner Radius</Label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <input type="range" min={0} max={32} value={design.theme.borderRadius || 0} onChange={e => pushDesign(d => { d.theme.borderRadius = parseInt(e.target.value); return d; })} style={{ flex: 1, accentColor: "#6366F1" }} />
                                        <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", width: 40, textAlign: "right" }}>{design.theme.borderRadius || 0}px</span>
                                    </div>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Canvas Background</Label>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                            <input type="color" value={design.theme.background} onChange={e => pushDesign(d => { d.theme.background = e.target.value; return d; })} style={{ position: "absolute", top: -8, left: -8, width: 56, height: 56, cursor: "pointer" }} />
                                        </div>
                                        <input value={design.theme.background} onChange={e => pushDesign(d => { d.theme.background = e.target.value; return d; })} style={{ ...inputStyle, marginBottom: 0 }} />
                                    </div>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Typography Base</Label>
                                    <select value={design.theme.fontFamily} onChange={e => pushDesign(d => { d.theme.fontFamily = e.target.value; return d; })} style={inputStyle}>
                                        <option value="'Inter', Arial, sans-serif">Inter (Modern Sans)</option>
                                        <option value="'Georgia', serif">Georgia (Classic Serif)</option>
                                        <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica (Clean)</option>
                                        <option value="'Courier New', Courier, monospace">Courier (Monospace)</option>
                                    </select>
                                </FormGroup>
                            </InspectorSection>
                        )}
                    </div>
                </div>
            </div>

            {/* ════ PREVIEW MODAL ════ */}
            {showPreview && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowPreview(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: "90vh", background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Live Email Render</span>
                            <button onClick={() => setShowPreview(false)} style={{ border: "1px solid #E2E8F0", background: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Close Preview</button>
                        </div>
                        <iframe srcDoc={compiledHtml} style={{ width: "100%", height: "70vh", border: "none" }} title="Preview" />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                * { box-sizing: border-box; }
                .block-card:hover { background-color: #F8FAFC !important; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05) !important; border-color: #E2E8F0 !important; }
                .row-card:hover { background-color: #F8FAFC !important; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; border-color: #E2E8F0 !important; }
            `}</style>
            <ImageUploadModal 
                isOpen={!!pendingImageCol} 
                onClose={() => setPendingImageCol(null)} 
                onUpload={(url) => { 
                    if (pendingImageCol) { 
                        if (typeof pendingImageCol === "string" && pendingImageCol.startsWith("blk-")) {
                            updateBlockProp(pendingImageCol, "src", url);
                        } else {
                            addBlockToZone(pendingImageCol as any, "image", { src: url }); 
                        }
                        setPendingImageCol(null); 
                    } 
                }} 
            />
        </div>
    );
}
