"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@supabase/supabase-js";
import "grapesjs/dist/css/grapes.min.css";

const API_BASE = "http://localhost:8000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TemplateBuilderPage({ params }: { params: { id: string } }) {
    const { token, user } = useAuth();
    const router = useRouter();
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [template, setTemplate] = useState<any>(null);

    // Fetch existing template HTML
    useEffect(() => {
        if (!token) return;
        const fetchTemplate = async () => {
            try {
                const res = await fetch(`${API_BASE}/templates/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTemplate(data);
                } else {
                    alert("Template not found");
                    router.push("/templates");
                }
            } catch (e) {
                console.error("Failed to load template", e);
            }
            setLoading(false);
        };
        fetchTemplate();
    }, [params.id, token, router]);

    // Initialize GrapesJS
    useEffect(() => {
        if (loading || !containerRef.current || !template) return;

        // Ensure window exists (NextJS SSR guard)
        if (typeof window === "undefined") return;

        const grapesjs = require("grapesjs");
        const presetMjml = require("grapesjs-mjml");

        const editor = grapesjs.init({
            container: containerRef.current,
            fromElement: true,
            height: '100vh',
            width: 'auto',
            storageManager: false, // We handle saving manually
            plugins: [presetMjml],
            pluginsOpts: {
                [presetMjml]: {
                    // MJML specific options if needed
                }
            },
            assetManager: {
                upload: true,
                uploadText: "Drop images here or click to upload",
                handleAdd: async (textFromInput: string) => {
                    editor.AssetManager.add(textFromInput);
                }
            }
        });

        // Set initial HTML or JSON state if it exists
        if (template.design_json && Object.keys(template.design_json).length > 0) {
            editor.loadProjectData(template.design_json);
        } else if (template.html_body) {
            editor.setComponents(template.html_body);
        }

        // Handle Supabase Upload Interception
        editor.on('asset:upload:start', () => {
            console.log("Upload started...");
        });

        // Add custom upload logic to the Asset Manager
        editor.AssetManager.addType('image', {
            view: {
                onRemove: () => {
                    // Could implement delete from Supabase here later
                    console.log("Image removed from canvas");
                }
            }
        });

        // The Custom File Uploader Intercept
        editor.Config.assetManager.uploadFile = async (e: any) => {
            const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
            if (!files || files.length === 0 || !user?.tenantId) return;

            const am = editor.AssetManager;

            for (let file of files) {
                try {
                    // 1. Generate unique filename inside the tenant's folder
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    // 2. Upload to Supabase Storage implicitly via JWT/Session 
                    // Note: In a robust production app, you'd pass the custom token if RLS requires it.
                    const { data, error } = await supabase.storage
                        .from('email_assets')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (error) throw error;

                    // 3. Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('email_assets')
                        .getPublicUrl(fileName);

                    // 4. Add to GrapesJS Canvas
                    am.add({
                        src: publicUrl,
                        name: file.name
                    });

                } catch (err: any) {
                    console.error("Upload failed:", err);
                    alert("Failed to upload image: " + err.message);
                }
            }
        };

        editorRef.current = editor;

        return () => {
            if (editorRef.current) {
                editorRef.current.destroy();
            }
        };
    }, [loading, template, user?.tenantId]);

    const handleSave = async () => {
        if (!editorRef.current || !token) return;
        setSaving(true);

        try {
            // Get combined HTML & CSS
            const html = editorRef.current.getHtml();
            const css = editorRef.current.getCss();
            
            // Get the GrapesJS drag-and-drop state JSON (this is the Canva magic!)
            const projectData = editorRef.current.getProjectData();

            // Generate a simple plain text fallback (strip tags)
            const tmpDiv = document.createElement("div");
            tmpDiv.innerHTML = html;
            const plainText = tmpDiv.textContent || tmpDiv.innerText || "";

            // Combine CSS securely inline or inside a style block for the API
            const finalHtml = `<style>${css}</style>${html}`;

            const res = await fetch(`${API_BASE}/templates/${params.id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: template.name,
                    category: template.category,
                    compiled_html: finalHtml, // The raw html string to send in emails
                    design_json: projectData, // The raw JSON editor state
                    variables: template.variables
                })
            });

            if (res.ok) {
                // Success
                router.push("/templates");
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to save template");
            }
        } catch (e) {
            console.error("Save error", e);
            alert("An error occurred while saving.");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
                <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
            {/* Top Toolbar */}
            <div style={{
                height: "60px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                backgroundColor: "var(--bg-card)",
                zIndex: 10
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <button
                        onClick={() => router.push("/templates")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                    >
                        <ArrowLeft style={{ width: "20px", height: "20px" }} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                            Editing: {template?.name || "Template"}
                        </h1>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                            {template?.category || "No Category"}
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--accent)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: saving ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: 500,
                            fontSize: "14px",
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? <Loader2 className="animate-spin" style={{ width: "16px", height: "16px" }} /> : <Save style={{ width: "16px", height: "16px" }} />}
                        Save & Exit
                    </button>
                </div>
            </div>

            {/* GrapesJS Editor Container */}
            <div style={{ flex: 1, overflow: "hidden" }}>
                <div ref={containerRef} style={{ height: "100%" }}></div>
            </div>

            {/* Simple CSS override to make GrapesJS play nice with our dark mode body */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .gjs-cv-canvas {
                    background-color: #ffffff; 
                }
                .gjs-block {
                    box-shadow: none;
                }
            `}} />
        </div>
    );
}
