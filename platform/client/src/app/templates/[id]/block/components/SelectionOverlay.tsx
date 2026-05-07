"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";


export function SelectionOverlay() {
    const { selectedNode, design, updateBlockProp } = useEditorStore();
    const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
    const observer = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (!selectedNode || selectedNode.type !== "block") {
            setRect(null);
            return;
        }

        const el = document.getElementById(selectedNode.id);
        if (!el) {
            setRect(null);
            return;
        }

        const updateRect = () => {
            const canvas = document.getElementById("editor-canvas-viewport");
            if (!canvas) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();

            setRect({
                top: elRect.top - canvasRect.top,
                left: elRect.left - canvasRect.left,
                width: elRect.width,
                height: elRect.height
            });
        };

        updateRect();
        
        observer.current = new ResizeObserver(updateRect);
        observer.current.observe(el);
        
        window.addEventListener("scroll", updateRect, true);
        window.addEventListener("resize", updateRect);

        return () => {
            observer.current?.disconnect();
            window.removeEventListener("scroll", updateRect, true);
            window.removeEventListener("resize", updateRect);
        };
    }, [selectedNode, design]);

    const [isResizing, setIsResizing] = useState<string | null>(null);
    const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!rect || !selectedNode) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;

            const updates: any = {};
            if (isResizing.includes("right")) updates.width = Math.max(20, startPos.current.width + dx);
            if (isResizing.includes("bottom")) updates.height = Math.max(20, startPos.current.height + dy);

            // Update the block in real-time (no history push yet)
            // Actually, for performance, we might want to only update local rect first
            // But let's try direct store update for now
            updateBlockProp(selectedNode.id, "width", updates.width);
            if (updates.height) updateBlockProp(selectedNode.id, "height", updates.height);
        };

        const handleMouseUp = () => {
            setIsResizing(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, rect, selectedNode, updateBlockProp]);

    if (!rect || !selectedNode) return null;

    const onResizeStart = (e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(handle);
        startPos.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };
    };

    const handleStyle: React.CSSProperties = {
        position: "absolute",
        width: 12,
        height: 12,
        background: "#fff",
        border: "2px solid #6366F1",
        borderRadius: "50%",
        zIndex: 100,
        boxShadow: "0 2px 6px rgba(99, 102, 241, 0.4)",
        pointerEvents: "auto"
    };

        const allBlocks = [...design.headerBlocks, ...design.bodyBlocks, ...design.footerBlocks];
        const block = allBlocks.find(b => b.id === selectedNode.id);
        const isFabricBlock = block && ["image", "floating-image", "floating-text"].includes(block.type);

        return (
            <div style={{
                position: "absolute",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                border: isFabricBlock ? "none" : "2px solid #6366F1",
                pointerEvents: "none",
                zIndex: 99,
                transition: isResizing ? "none" : "all 0.1s ease-out"
            }}>
                {!isFabricBlock && (
                    <>
                        <div onMouseDown={(e) => onResizeStart(e, "top-left")} style={{ ...handleStyle, top: -6, left: -6, cursor: "nwse-resize" }} />
                        <div onMouseDown={(e) => onResizeStart(e, "top-right")} style={{ ...handleStyle, top: -6, right: -6, cursor: "nesw-resize" }} />
                        <div onMouseDown={(e) => onResizeStart(e, "bottom-left")} style={{ ...handleStyle, bottom: -6, left: -6, cursor: "nesw-resize" }} />
                        <div onMouseDown={(e) => onResizeStart(e, "bottom-right")} style={{ ...handleStyle, bottom: -6, right: -6, cursor: "nwse-resize" }} />
                    </>
                )}

        </div>
    );
}


