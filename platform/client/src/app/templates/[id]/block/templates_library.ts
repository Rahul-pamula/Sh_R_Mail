import { DesignJSON } from "./types";

export interface TemplatePreset {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    design: DesignJSON;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
    {
        id: "welcome-email",
        name: "Modern Welcome",
        description: "A clean, minimalist welcome email with a large hero image.",
        thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#6366f1", paragraphColor: "#475569", borderRadius: 8, background: "#f8fafc", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [
                { id: "h1", type: "text", props: { content: "WELCOME ABOARD", fontSize: 24, fontWeight: "bold", align: "center", color: "#1e293b" } }
            ],
            bodyBlocks: [
                { id: "b1", type: "image", props: { src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600", borderRadius: 12 } },
                { id: "b2", type: "text", props: { content: "We're so excited to have you with us. Our mission is to help you build beautiful emails without the stress.", align: "center", fontSize: 18 } },
                { id: "b3", type: "button", props: { text: "Get Started Now", backgroundColor: "#6366f1", color: "#ffffff", borderRadius: 8, align: "center" } }
            ],
            footerBlocks: [
                { id: "f1", type: "text", props: { content: "© 2024 Your Brand. All rights reserved.", fontSize: 12, align: "center", color: "#94a3b8" } }
            ]
        }
    },
    {
        id: "flash-sale",
        name: "Flash Sale",
        description: "Bold colors and large buttons for high conversion sales.",
        thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#ef4444", paragraphColor: "#1e293b", borderRadius: 0, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [
                { id: "h1", type: "text", props: { content: "FLASH SALE: 50% OFF", fontSize: 28, fontWeight: "900", align: "center", color: "#ef4444" } }
            ],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "TODAY ONLY. DON'T BLINK.", align: "center", fontSize: 48, fontWeight: "900", color: "#111827" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600" } },
                { id: "b3", type: "button", props: { text: "SHOP THE SALE", backgroundColor: "#000000", color: "#ffffff", borderRadius: 0, align: "center", padding: 20 } }
            ],
            footerBlocks: [
                { id: "f1", type: "text", props: { content: "Unsubscribe | View in Browser", fontSize: 12, align: "center", color: "#6b7280" } }
            ]
        }
    },
    {
        id: "newsletter-minimal",
        name: "Minimal Newsletter",
        description: "Elegant layout for long-form content and articles.",
        thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#111827", paragraphColor: "#374151", borderRadius: 4, background: "#fafafa", contentWidth: 600, fontFamily: "Georgia" },
            headerBlocks: [
                { id: "h1", type: "text", props: { content: "The Weekly Dispatch", fontSize: 20, fontStyle: "italic", align: "left" } }
            ],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Understanding Modern AI Ecosystems", fontSize: 32, fontWeight: "700", align: "left" } },
                { id: "b2", type: "text", props: { content: "By Jane Doe • March 23, 2024", fontSize: 14, color: "#9ca3af" } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600" } },
                { id: "b4", type: "text", props: { content: "Artificial Intelligence has shifted from a buzzword to a fundamental building block of modern software. In this issue, we explore...", fontSize: 16 } },
                { id: "b5", type: "button", props: { text: "Read More", backgroundColor: "transparent", border: "1px solid #111827", color: "#111827", align: "left" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "product-launch",
        name: "The Future of Tech",
        description: "Premium product launch with feature grids and dark theme.",
        thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#0ea5e9", paragraphColor: "#94a3b8", borderRadius: 12, background: "#0f172a", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "LAUNCH DAY", fontSize: 14, fontWeight: "bold", align: "center", color: "#38bdf8" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Meet the New Standard.", fontSize: 40, fontWeight: "bold", align: "center", color: "#f8fafc" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600", borderRadius: 20 } },
                { id: "b3", type: "layout", props: { layoutType: "3-col", columns: [
                    { blocks: [{ id: "c1", type: "text", props: { content: "FASTER", fontWeight: "bold", color: "#fff", align: "center" } }] },
                    { blocks: [{ id: "c2", type: "text", props: { content: "SMARTER", fontWeight: "bold", color: "#fff", align: "center" } }] },
                    { blocks: [{ id: "c3", type: "text", props: { content: "DEEPER", fontWeight: "bold", color: "#fff", align: "center" } }] }
                ] } },
                { id: "b4", type: "button", props: { text: "ORDER NOW", backgroundColor: "#0ea5e9", color: "#ffffff", borderRadius: 50, align: "center", width: "80%" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "receipt",
        name: "Official Receipt",
        description: "Clean, transactional email for order confirmations.",
        thumbnail: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#10b981", paragraphColor: "#4b5563", borderRadius: 4, background: "#ffffff", contentWidth: 600, fontFamily: "Helvetica" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "Order #88321 Confirmed", fontSize: 18, fontWeight: "bold", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Thank you for your purchase!", fontSize: 24, align: "center", color: "#10b981" } },
                { id: "b2", type: "divider", props: { thickness: 1, color: "#e5e7eb" } },
                { id: "b3", type: "text", props: { content: "Your order is being processed and will ship within 24 hours. You can track your progress below.", align: "center" } },
                { id: "b4", type: "button", props: { text: "TRACK ORDER", backgroundColor: "#10b981", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: [{ id: "f1", type: "text", props: { content: "Help Center | Contact Support", fontSize: 12, align: "center" } }]
        }
    },
    {
        id: "event-invite",
        name: "Garden Party Gala",
        description: "Floral, elegant invitation with centered serif text.",
        thumbnail: "https://images.unsplash.com/photo-1530103043960-ef38714abb15?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#be185d", paragraphColor: "#3d0a21", borderRadius: 20, background: "#fff5f7", contentWidth: 600, fontFamily: "Georgia" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "image", props: { src: "https://images.unsplash.com/photo-1530103043960-ef38714abb15?w=600", borderRadius: "50%" } },
                { id: "b2", type: "text", props: { content: "You are Invited.", fontSize: 36, fontStyle: "italic", align: "center" } },
                { id: "b3", type: "text", props: { content: "Join us for an evening of music and connection at the annual Spring Gala.", align: "center", fontSize: 18 } },
                { id: "b4", type: "button", props: { text: "RSVP NOW", backgroundColor: "#be185d", color: "#ffffff", borderRadius: 50, align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "abandoned-cart",
        name: "Forgot Something?",
        description: "Friendly nudge with item previews and recovery link.",
        thumbnail: "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#f59e0b", paragraphColor: "#374151", borderRadius: 8, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "STILL INTERESTED?", fontSize: 14, fontWeight: "bold", align: "center", color: "#f59e0b" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Your cart is missing you.", fontSize: 28, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1557821552-17105176677c?w=600" } },
                { id: "b3", type: "text", props: { content: "We've saved your items for you. Click below to return and complete your order.", align: "center" } },
                { id: "b4", type: "button", props: { text: "RETURN TO CART", backgroundColor: "#f59e0b", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "birthday",
        name: "Birthday Surprise",
        description: "Fun, vibrant birthday message with a special gift.",
        thumbnail: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#db2777", paragraphColor: "#4b5563", borderRadius: 10, background: "#fdf2f8", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "HAPPY BIRTHDAY!", fontSize: 40, fontWeight: "900", align: "center", color: "#db2777" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600" } },
                { id: "b3", type: "text", props: { content: "To celebrate your special day, here is a 25% discount code just for you: **HB25**", align: "center", fontSize: 18 } },
                { id: "b4", type: "button", props: { text: "REDEEM GIFT", backgroundColor: "#db2777", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "webinar-signup",
        name: "Webinar Masterclass",
        description: "Educational layout with speaker details and signup.",
        thumbnail: "https://images.unsplash.com/photo-1540575861501-7ad0582373f3?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#6366f1", paragraphColor: "#475569", borderRadius: 4, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "LIVE WORKSHOP", fontSize: 14, fontWeight: "bold", color: "#6366f1" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Scaling Your Agency in 2024", fontSize: 32, fontWeight: "bold" } },
                { id: "b2", type: "text", props: { content: "Wednesday, March 27 • 10:00 AM PST", fontSize: 16, fontWeight: "bold", color: "#111827" } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1540575861501-7ad0582373f3?w=600" } },
                { id: "b4", type: "text", props: { content: "Join our CEO as he shares the exact systems used to scale from $0 to $1M in MRR." } },
                { id: "b5", type: "button", props: { text: "SAVE MY SEAT", backgroundColor: "#6366f1", color: "#ffffff", width: "100%" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "internal-update",
        name: "Corporate Brief",
        description: "Clean, professional internal communication with list.",
        thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#334155", paragraphColor: "#475569", borderRadius: 2, background: "#f1f5f9", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "INTERNAL MEMO", fontSize: 12, fontWeight: "bold", color: "#64748b" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Q1 Results & Future Outlook", fontSize: 24, fontWeight: "bold" } },
                { id: "b2", type: "text", props: { content: "Team, we've had a record-breaking quarter. Here are the key highlights and our focus areas for Q2." } },
                { id: "b3", type: "divider", props: { thickness: 2, color: "#cbd5e1" } },
                { id: "b4", type: "text", props: { content: "• 20% Growth in User Base\n• Successful Launch of Version 2.0\n• New Partnership with Industry Leaders", fontSize: 16 } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "feedback-survey",
        name: "How are we doing?",
        description: "Simple, high-response survey with Star rating look.",
        thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#9333ea", paragraphColor: "#4b5563", borderRadius: 12, background: "#faf5ff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Your feedback matters.", fontSize: 24, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600", borderRadius: 12 } },
                { id: "b3", type: "text", props: { content: "Could you spare 1 minute to tell us about your experience? We read every single response.", align: "center" } },
                { id: "b4", type: "button", props: { text: "START SURVEY", backgroundColor: "#9333ea", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "portfolio",
        name: "Creative Portfolio",
        description: "Visual-first look for photographers and designers.",
        thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#000000", paragraphColor: "#525252", borderRadius: 0, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "ALEX RIVERA // DESIGNER", fontSize: 12, fontWeight: "bold", align: "right" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Selected Works 2024", fontSize: 32, fontWeight: "900" } },
                { id: "b2", type: "layout", props: { layoutType: "2-col", columns: [
                    { blocks: [{ id: "i1", type: "image", props: { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300" } }] },
                    { blocks: [{ id: "i2", type: "image", props: { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300" } }] }
                ] } },
                { id: "b3", type: "button", props: { text: "VIEW FULL PROJECT", backgroundColor: "#000000", color: "#ffffff", width: "100%", marginTop: 20 } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "referral",
        name: "Friend Referral",
        description: "Incentive-driven layout for viral growth.",
        thumbnail: "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#22c55e", paragraphColor: "#4b5563", borderRadius: 16, background: "#f0fdf4", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "SHARE THE LOVE", fontSize: 14, fontWeight: "bold", align: "center", color: "#22c55e" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Give $20, Get $20.", fontSize: 36, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "layout", props: { layoutType: "2-col", columns: [
                    { blocks: [{ id: "t1", type: "text", props: { content: "FOR THEM\n$20 Off their first order", align: "center", fontWeight: "bold" } }] },
                    { blocks: [{ id: "t2", type: "text", props: { content: "FOR YOU\n$20 Credit to your account", align: "center", fontWeight: "bold" } }] }
                ] } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=600", borderRadius: 12 } },
                { id: "b4", type: "button", props: { text: "INVITE FRIENDS", backgroundColor: "#22c55e", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "podcast",
        name: "Weekly Podcast",
        description: "Engaging audio content summary with listen links.",
        thumbnail: "https://images.unsplash.com/photo-1478737270239-2fccd27ee8f0?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#8b5cf6", paragraphColor: "#334155", borderRadius: 8, background: "#f5f3ff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "EPISODE #42 IS LIVE", fontSize: 14, fontWeight: "bold", align: "center", color: "#8b5cf6" } }],
            bodyBlocks: [
                { id: "b1", type: "image", props: { src: "https://images.unsplash.com/photo-1478737270239-2fccd27ee8f0?w=600", borderRadius: 24 } },
                { id: "b2", type: "text", props: { content: "The Future of Remote Work", fontSize: 28, fontWeight: "bold", align: "center" } },
                { id: "b3", type: "text", props: { content: "In this episode, we sit down with industry leaders to discuss how office culture is evolving in 2024.", align: "center" } },
                { id: "b4", type: "button", props: { text: "LISTEN NOW", backgroundColor: "#8b5cf6", color: "#ffffff", borderRadius: 50, align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "exclusive-elite",
        name: "Elite Membership",
        description: "Dark, luxurious aesthetic for VIP members.",
        thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#fbbf24", paragraphColor: "#a1a1aa", borderRadius: 0, background: "#09090b", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "VIP ACCESS", fontSize: 12, fontWeight: "bold", color: "#fbbf24", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Welcome to the Inner Circle.", fontSize: 32, fontWeight: "bold", align: "center", color: "#ffffff" } },
                { id: "b2", type: "divider", props: { thickness: 1, color: "#fbbf24" } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=600" } },
                { id: "b4", type: "text", props: { content: "You are now part of an exclusive group with early access to all our limited releases.", align: "center" } },
                { id: "b5", type: "button", props: { text: "EXPLORE BENEFITS", backgroundColor: "#fbbf24", color: "#000", fontWeight: "bold", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "careers",
        name: "We're Hiring!",
        description: "Professional job board layout for recruitment.",
        thumbnail: "https://images.unsplash.com/photo-1521737706076-34adaa091c80?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#2563eb", paragraphColor: "#475569", borderRadius: 12, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "JOIN OUR TEAM", fontSize: 14, fontWeight: "bold", color: "#2563eb" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Help us build the future of communication.", fontSize: 28, fontWeight: "bold" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1521737706076-34adaa091c80?w=600", borderRadius: 12 } },
                { id: "b3", type: "text", props: { content: "We are looking for talented individuals to join our engineering and design teams. Check out our open roles below." } },
                { id: "b4", type: "button", props: { text: "VIEW OPEN ROLES", backgroundColor: "#2563eb", color: "#ffffff", borderRadius: 8 } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "app-update",
        name: "What's New in v3.0",
        description: "Engaging summary of new app features and updates.",
        thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#0ea5e9", paragraphColor: "#334155", borderRadius: 20, background: "#f0f9ff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "NEW UPDATE", fontSize: 12, fontWeight: "bold", align: "center", color: "#0ea5e9" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Version 3.0 is here.", fontSize: 32, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600", borderRadius: 24 } },
                { id: "b3", type: "text", props: { content: "• **Dark Mode**: Your most requested feature is finally live.\n• **Faster Search**: Find your emails in half the time.\n• **Offline Access**: Work from anywhere, even without internet.", fontSize: 16 } },
                { id: "b4", type: "button", props: { text: "UPDATE APP", backgroundColor: "#0ea5e9", color: "#ffffff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "hiring-senior-dev",
        name: "Hire: Senior Developer",
        description: "Code-centric recruitment template for engineering roles.",
        thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#000000", paragraphColor: "#e2e8f0", borderRadius: 4, background: "#0f172a", contentWidth: 600, fontFamily: "Courier New" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "// JOB_OPENING", fontSize: 14, color: "#10b981", fontWeight: "bold" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "We are looking for a Senior Software Engineer.", fontSize: 32, color: "#fff", fontWeight: "bold" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600", borderRadius: 8 } },
                { id: "b3", type: "text", props: { content: "Stack: React, Node.js, TypeScript, PostgreSQL.\nLocation: Remote (Global).\nBenefits: High equity, flexible PTO." } },
                { id: "b4", type: "button", props: { text: "APPLY NOW", backgroundColor: "#10b981", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "hiring-visual-designer",
        name: "Hire: Visual Designer",
        description: "Aesthetic recruitment focused on portfolio and creativity.",
        thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#6366f1", paragraphColor: "#1f2937", borderRadius: 32, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "We need more eyes like yours.", fontSize: 40, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=600", borderRadius: 40 } },
                { id: "b3", type: "text", props: { content: "Our design team is growing. We're looking for a Visual Designer who dreams in pixels and lives in Figma.", align: "center" } },
                { id: "b4", type: "button", props: { text: "SHOW US YOUR PORTFOLIO", backgroundColor: "#000", color: "#fff", borderRadius: 50, align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "announcement-partnership",
        name: "Partnered for Success",
        description: "Celebratory announcement for new business partnerships.",
        thumbnail: "https://images.unsplash.com/photo-1521737706076-34adaa091c80?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#4f46e5", paragraphColor: "#475569", borderRadius: 12, background: "#f8fafc", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "EXCITING NEWS", fontSize: 14, fontWeight: "bold", color: "#4f46e5", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Stronger Together.", fontSize: 36, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "layout", props: { layoutType: "2-col", columns: [
                    { blocks: [{ id: "l1", type: "image", props: { src: "https://images.unsplash.com/photo-1521737706076-34adaa091c80?w=300" } }] },
                    { blocks: [{ id: "l2", type: "image", props: { src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300" } }] }
                ] } },
                { id: "b3", type: "text", props: { content: "We are thrilled to announce our official partnership with TechGlobal. Together, we will redefine the future of email marketing.", align: "center" } },
                { id: "b4", type: "button", props: { text: "READ THE FULL PRESS RELEASE", backgroundColor: "#4f46e5", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "achievement-10k",
        name: "10,000 Milestone",
        description: "Celebratory template for reaching major user milestones.",
        thumbnail: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#f59e0b", paragraphColor: "#4b5563", borderRadius: 100, background: "#fff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "10,000 REASONS TO CELEBRATE", fontSize: 24, fontWeight: "bold", align: "center", color: "#f59e0b" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=600", borderRadius: 20 } },
                { id: "b3", type: "text", props: { content: "We've officially hit 10,000 customers! We couldn't have done it without your incredible support. Thank you for being part of the journey.", align: "center", fontSize: 18 } },
                { id: "b4", type: "button", props: { text: "CLAIM YOUR MYSTERY GIFT", backgroundColor: "#f59e0b", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "program-loyalty",
        name: "VIP Loyalty Reward",
        description: "Specialized design for reward programs and status updates.",
        thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#111827", paragraphColor: "#374151", borderRadius: 0, background: "#fafafa", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "STATUS UPDATE", fontSize: 12, fontWeight: "bold", align: "right" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "You've earned it.", fontSize: 32, fontWeight: "900" } },
                { id: "b2", type: "text", props: { content: "Welcome to the Gold Tier. You now have access to exclusive member-only pricing and free shipping on ALL orders.", fontSize: 16 } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=600" } },
                { id: "b4", type: "button", props: { text: "EXPLORE GOLD BENEFITS", backgroundColor: "#111827", color: "#fff", width: "100%" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "email-professional-pitch",
        name: "Professional Intro",
        description: "Clean, business-focused template for pitches and introductions.",
        thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#2563eb", paragraphColor: "#475569", borderRadius: 8, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Let's build something together.", fontSize: 24, fontWeight: "bold" } },
                { id: "b2", type: "text", props: { content: "I've been following your work at TechGlobal and I think our latest automation tools could double your team's efficiency.", fontSize: 16 } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600", borderRadius: 8 } },
                { id: "b4", type: "button", props: { text: "BOOK A 15-MIN DEMO", backgroundColor: "#2563eb", color: "#fff" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "announcement-price-drop",
        name: "Price Drop Alert",
        description: "High-impact announcement for price cuts and savings.",
        thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#ef4444", paragraphColor: "#1e293b", borderRadius: 12, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "NEW LOW PRICE", fontSize: 14, fontWeight: "bold", color: "#ef4444", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Save $200 Starting Today.", fontSize: 32, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600", borderRadius: 20 } },
                { id: "b3", type: "text", props: { content: "We've optimized our supply chain and we're passing the savings directly to you. No coupon required.", align: "center" } },
                { id: "b4", type: "button", props: { text: "GET THE NEW PRICE", backgroundColor: "#000", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "achievement-team",
        name: "Team Milestone",
        description: "Celebratory template for internal company achievements.",
        thumbnail: "https://images.unsplash.com/photo-1522071823991-b99c22ed200b?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#6366f1", paragraphColor: "#4b5563", borderRadius: 16, background: "#f8fafc", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "You Crushed It.", fontSize: 40, fontWeight: "900", align: "center", color: "#4f46e5" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1522071823991-b99c22ed200b?w=600", borderRadius: 24 } },
                { id: "b3", type: "text", props: { content: "Team, we just hit our revenue goals for the entire year 3 months early! Dinner is on the house this Friday.", align: "center", fontSize: 18 } },
                { id: "b4", type: "button", props: { text: "VIEW THE FINISH LINE", backgroundColor: "#6366f1", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "program-challenge",
        name: "30-Day Mastery",
        description: "Course or challenge template with progress focus.",
        thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#ec4899", paragraphColor: "#475569", borderRadius: 8, background: "#fdf2f8", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "DAY 1 OF 30", fontSize: 14, fontWeight: "bold", color: "#ec4899" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Welcome to the Deep Work Challenge.", fontSize: 24, fontWeight: "bold" } },
                { id: "b2", type: "text", props: { content: "Your first task is simple: Set aside 4 hours of uninterrupted work today. No email, no Slack, just focus." } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600", borderRadius: 12 } },
                { id: "b4", type: "button", props: { text: "MARK AS COMPLETE", backgroundColor: "#ec4899", color: "#fff", width: "100%" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "email-weekly-digest",
        name: "Weekly Digest Roundup",
        description: "Clean content roundup with multiple articles and links.",
        thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#334155", paragraphColor: "#475569", borderRadius: 4, background: "#fff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "MUST READS: MARCH 24", fontSize: 12, fontWeight: "bold", color: "#64748b" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "The Best of the Week", fontSize: 28, fontWeight: "bold" } },
                { id: "b2", type: "layout", props: { layoutType: "2-col", columns: [
                    { blocks: [{ id: "1t", type: "text", props: { content: "The AI Revolution\r\nHow LLMs are changing search.", fontSize: 14 } }, { id: "1b", type: "button", props: { text: "Link", fontSize: 12 } }] },
                    { blocks: [{ id: "2t", type: "text", props: { content: "Future of SaaS\r\nWhy product-led growth wins.", fontSize: 14 } }, { id: "2b", type: "button", props: { text: "Link", fontSize: 12 } }] }
                ] } },
                { id: "b3", type: "divider", props: { thickness: 1, color: "#e2e8f0" } },
                { id: "b4", type: "text", props: { content: "Want more? Check our full archive online.", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "achievement-certification",
        name: "Certified Specialist",
        description: "Official-looking template for certificates and achievements.",
        thumbnail: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#000", paragraphColor: "#4b5563", borderRadius: 0, background: "#fffcf2", contentWidth: 600, fontFamily: "Georgia" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "CERTIFICATE OF ACHIEVEMENT", fontSize: 20, color: "#b8860b", align: "center", fontWeight: "bold" } },
                { id: "b2", type: "divider", props: { color: "#b8860b", thickness: 2 } },
                { id: "b3", type: "text", props: { content: "This certifies that [Name] has successfully completed the Master Course in Email Design.", align: "center", fontSize: 18 } },
                { id: "b4", type: "image", props: { src: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600" } },
                { id: "b5", type: "button", props: { text: "DOWNLOAD CERTIFICATE", backgroundColor: "#b8860b", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "hiring-sales-hero",
        name: "Hire: Sales Hero",
        description: "Aggressive, high-energy recruitment for sales roles.",
        thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#10b981", paragraphColor: "#1e293b", borderRadius: 8, background: "#ffffff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "EARN BIG", fontSize: 14, fontWeight: "bold", color: "#10b981", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "We need a Sales Closer.", fontSize: 36, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600", borderRadius: 12 } },
                { id: "b3", type: "text", props: { content: "Uncapped commission. Top-tier leads. Join the team that's setting records every month.", align: "center", fontSize: 18 } },
                { id: "b4", type: "button", props: { text: "PITCH US YOURSELF", backgroundColor: "#10b981", color: "#fff", align: "center", width: "100%" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "announcement-v4",
        name: "Release v4.0",
        description: "Futuristic announcement for major software releases.",
        thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#f472b6", paragraphColor: "#94a3b8", borderRadius: 24, background: "#0a0a0a", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "STABLE RELEASE", fontSize: 10, color: "#f472b6", align: "center", fontWeight: "bold" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Hello, v4.0", fontSize: 48, fontWeight: "900", align: "center", color: "#fff" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1550745165-9bc0ab22a3ad?w=600", borderRadius: 32 } },
                { id: "b3", type: "text", props: { content: "Real-time collaboration. Atomic design system. 200% faster exports. The future of design is here.", align: "center" } },
                { id: "b4", type: "button", props: { text: "UPGRADE NOW", backgroundColor: "#f472b6", color: "#000", fontWeight: "bold", borderRadius: 50, align: "center" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "program-early-access",
        name: "Beta Early Access",
        description: "Mystery-focused invitation for exclusive early access.",
        thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#6366f1", paragraphColor: "#334155", borderRadius: 0, background: "#f8fafc", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "You're on the list.", fontSize: 32, fontWeight: "bold" } },
                { id: "b2", type: "text", props: { content: "We're opening up our Private Beta to only 100 users. Your spot is reserved for the next 24 hours." } },
                { id: "b3", type: "image", props: { src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600" } },
                { id: "b4", type: "button", props: { text: "ENTER PRIVATE BETA", backgroundColor: "#6366f1", color: "#fff" } }
            ],
            footerBlocks: []
        }
    },
    {
        id: "achievement-award",
        name: "Award of Excellence",
        description: "Prestigious template for sharing company award news.",
        thumbnail: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&h=200&fit=crop",
        design: {
            theme: { primaryColor: "#c2410c", paragraphColor: "#4b5563", borderRadius: 4, background: "#fff", contentWidth: 600, fontFamily: "Inter" },
            headerBlocks: [{ id: "h1", type: "text", props: { content: "INDUSTRY AWARDS 2024", fontSize: 12, fontWeight: "bold", color: "#c2410c", align: "center" } }],
            bodyBlocks: [
                { id: "b1", type: "text", props: { content: "Voted #1 Platform.", fontSize: 32, fontWeight: "bold", align: "center" } },
                { id: "b2", type: "image", props: { src: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=600" } },
                { id: "b3", type: "text", props: { content: "We are incredibly honored to be named the #1 Email Automation platform at the 2024 Global Tech Awards. Thank you for voting for us!", align: "center" } },
                { id: "b4", type: "button", props: { text: "READ THE STORY", backgroundColor: "#c2410c", color: "#fff", align: "center" } }
            ],
            footerBlocks: []
        }
    }
];
