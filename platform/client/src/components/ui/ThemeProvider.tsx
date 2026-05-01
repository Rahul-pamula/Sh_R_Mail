"use client";

/**
 * ThemeProvider
 * Wraps next-themes provider and ensures SSR-safe rendering.
 * Use `attribute="class"` so next-themes adds/removes the `.dark` class on <html>.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="shrflow-theme"
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
