import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                /* ── Design Token Colors (map CSS vars so className="bg-card" works) ── */
                "bg-primary": "var(--bg-primary)",
                "bg-card": "var(--bg-card)",
                "bg-hover": "var(--bg-hover)",
                "bg-input": "var(--bg-input)",
                "accent": "var(--accent)",
                "accent-hover": "var(--accent-hover)",
                "accent-purple": "var(--accent-purple)",
                "text-primary": "var(--text-primary)",
                "text-muted": "var(--text-muted)",
                "border-color": "var(--border)",
                "success": "var(--success)",
                "success-bg": "var(--success-bg)",
                "warning": "var(--warning)",
                "warning-bg": "var(--warning-bg)",
                "danger": "var(--danger)",
                "danger-bg": "var(--danger-bg)",
                "info": "var(--info)",
                "info-bg": "var(--info-bg)",

                /* ── shadcn-ui compatible colors (hsl vars) ── */
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border-hsl))",
                input: "hsl(var(--input-hsl))",
                ring: "hsl(var(--ring))",
            },

            borderRadius: {
                DEFAULT: "var(--radius)",
                lg: "var(--radius-lg)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },

            fontSize: {
                "h1": ["var(--text-h1)", { fontWeight: "700" }],
                "h2": ["var(--text-h2)", { fontWeight: "600" }],
                "h3": ["var(--text-h3)", { fontWeight: "600" }],
                "body": ["var(--text-body)", {}],
                "caption": ["var(--text-caption)", {}],
                "mono": ["var(--text-mono)", {}],
            },

            animation: {
                "fade-in": "fadeIn 0.2s ease-out",
                "slide-in": "slideIn 0.2s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "pulse-dot": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },

            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(4px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideIn: {
                    "0%": { opacity: "0", transform: "translateX(-8px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
