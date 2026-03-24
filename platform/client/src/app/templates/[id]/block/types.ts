// ── TYPES ──────────────────────────────────────────────────────────────────
export type BlockType = "text" | "image" | "button" | "divider" | "spacer" | "social" | "hero" | "footer" | "shape" | "line" | "floating-text" | "floating-image" | "layout" | "rating" | "countdown" | "html";

export interface DesignBlock { id: string; type: BlockType; props: Record<string, any>; }
export interface DesignTheme { 
    background: string; 
    contentWidth: number; 
    fontFamily: string; 
    primaryColor: string; 
    borderRadius: number;
    paragraphColor: string;
}
export interface DesignJSON { 
    theme: DesignTheme; 
    headerBlocks: DesignBlock[];
    bodyBlocks: DesignBlock[];
    footerBlocks: DesignBlock[];
}

export interface SelectedNode { type: "block"; id: string; }

// ── DEFAULTS ───────────────────────────────────────────────────────────────
export const DEFAULT_THEME: DesignTheme = {
    background: "#f8f9fb", contentWidth: 600,
    fontFamily: "'Inter', Arial, sans-serif", primaryColor: "#6366F1",
    borderRadius: 8, paragraphColor: "#475569",
};

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ── BLOCK REGISTRY ─────────────────────────────────────────────────────────
export const BLOCK_DEFAULTS: Record<BlockType, { label: string; defaults: Record<string, any> }> = {
    text: { label: "Text", defaults: { content: "", fontSize: 16, align: "left", color: "#475569", fontWeight: "normal" } },
    image: { label: "Image", defaults: { src: "https://placehold.co/540x200/e2e8f0/94a3b8?text=Your+Image", alt: "Image", align: "center", width: "100%", linkUrl: "" } },
    button: { label: "Button", defaults: { text: "Click Here →", url: "#", backgroundColor: "#6366F1", color: "#ffffff", align: "center", borderRadius: 8, paddingV: 14, paddingH: 28 } },
    divider: { label: "Divider", defaults: { color: "#E5E7EB", thickness: 1 } },
    spacer: { label: "Spacer", defaults: { height: 32 } },
    social: { label: "Social", defaults: { align: "center", icons: [{ platform: "facebook", url: "#" }, { platform: "instagram", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] } },
    hero: { label: "Hero", defaults: { headline: "Big Announcement!", subheadline: "Something amazing is coming.", bgColor: "#6366F1", textColor: "#ffffff" } },
    footer: { label: "Footer", defaults: { content: "© 2026 Company · Unsubscribe", fontSize: 12, color: "#9CA3AF", align: "center" } },
    shape: { label: "Shape", defaults: { shapeType: "rect", backgroundColor: "#6366F1", borderColor: "transparent", borderWidth: 0, width: 100, height: 100, borderRadius: 0, align: "center" } },
    line: { label: "Line", defaults: { lineType: "solid", color: "#475569", thickness: 2, width: "100%", align: "center", paddingTop: 10, paddingBottom: 10 } },
    "floating-text": { label: "Floating Text", defaults: { content: "I'm a floating box!", fontSize: 16, color: "#475569", x: 100, y: 100, width: 200, padding: 12, backgroundColor: "transparent", borderRadius: 8, borderColor: "#6366F1", borderWidth: 2 } },
    "floating-image": { label: "Floating Image", defaults: { src: "https://placehold.co/200x200/e2e8f0/94a3b8?text=Floating+Image", alt: "Image", x: 150, y: 150, width: 200, padding: 0, borderRadius: 0, borderColor: "transparent", borderWidth: 0 } },
    layout: { label: "Layout Row", defaults: { layoutType: "2-col", columns: [{ blocks: [] }, { blocks: [] }], padding: 20, gap: 20 } },
    rating: { label: "Rating", defaults: { count: 5, color: "#FFD700", align: "center" } },
    countdown: { label: "Countdown", defaults: { endTime: "", color: "#334155", align: "center" } },
    html: { label: "HTML", defaults: { content: "<div>Custom HTML</div>" } },
};
