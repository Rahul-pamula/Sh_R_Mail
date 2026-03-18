/**
 * Supabase Edge Function: track
 * Handles email open pixel and click redirect tracking.
 *
 * Routes (via URL path):
 *   GET /functions/v1/track/open/{dispatch_id}?s={sig}   → 1x1 pixel
 *   GET /functions/v1/track/click?d={id}&u={url}&s={sig} → 302 redirect
 *
 * Ported from: platform/api/routes/tracking.py
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── 1×1 transparent GIF ──────────────────────────────────────────────────────
const PIXEL_GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

// ── Bot / proxy detection ─────────────────────────────────────────────────────
const BOT_UA_FRAGMENTS = [
  "googlebot","bingbot","yahoobot","slurp","duckduckbot","baiduspider",
  "yandexbot","sogou","exabot","semrushbot","ahrefs","mj12bot","dotbot",
  "rogerbot","screaming frog","googleimageproxy","ggpht.com",
  "yahoo link preview","yahooproxy","applebot",
  "preview","scanner","curl","python-requests","go-http-client",
  "postmanruntime","axios","okhttp","facebookexternalhit",
];

const PROXY_GMAIL   = ["66.249.84.","66.249.85.","66.249.89.","66.249.91.","72.14.199.","74.125.","104.28.","108.177."];
const PROXY_YAHOO   = ["216.39.62.","66.218.66."];
const PROXY_APPLE   = ["17."];
const PROXY_OUTLOOK = ["40.","52.","13.107.","204.79.","207.46.","20."];

function classifySource(ua: string, ip: string, honeypot: boolean): { source: string; isBot: boolean } {
  const uaL = (ua || "").toLowerCase();
  const ipS  = ip || "";

  if (honeypot) return { source: "honeypot", isBot: true };

  if (PROXY_GMAIL.some(p => ipS.startsWith(p))   || uaL.includes("googleimageproxy") || uaL.includes("ggpht.com"))
    return { source: "gmail_proxy",   isBot: true };
  if (PROXY_APPLE.some(p => ipS.startsWith(p))   || uaL.includes("applebot"))
    return { source: "apple_mpp",     isBot: true };
  if (PROXY_OUTLOOK.some(p => ipS.startsWith(p)) || uaL.includes("safelinks") || uaL.includes("microsoft"))
    return { source: "outlook_proxy", isBot: true };
  if (PROXY_YAHOO.some(p => ipS.startsWith(p))   || uaL.includes("yahooproxy"))
    return { source: "yahoo_proxy",   isBot: true };
  if (BOT_UA_FRAGMENTS.some(f => uaL.includes(f)))
    return { source: "scanner",       isBot: true };

  return { source: "human", isBot: false };
}

// ── HMAC-SHA256 helper ────────────────────────────────────────────────────────
async function verifySignature(secret: string, base: string, provided: string | null): Promise<boolean> {
  if (!provided) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  // Constant-time compare
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

// ── DB event recorder ─────────────────────────────────────────────────────────
async function recordEvent(
  db: ReturnType<typeof createClient>,
  dispatchId: string,
  eventType: "open" | "click",
  url: string | null,
  ip: string,
  userAgent: string,
  source: string,
  isBot: boolean,
): Promise<void> {
  try {
    // Resolve campaign_id + subscriber_id from dispatch row
    const { data: dispRows } = await db
      .from("campaign_dispatch")
      .select("campaign_id, subscriber_id")
      .eq("id", dispatchId)
      .limit(1);

    if (!dispRows?.length) {
      console.warn(`[TRACK] dispatch not found: ${dispatchId}`);
      return;
    }

    const { campaign_id, subscriber_id } = dispRows[0];

    // Get tenant_id from campaign
    const { data: campRows } = await db
      .from("campaigns")
      .select("tenant_id")
      .eq("id", campaign_id)
      .limit(1);

    if (!campRows?.length) {
      console.warn(`[TRACK] campaign not found: ${campaign_id}`);
      return;
    }

    const tenant_id = campRows[0].tenant_id;

    // Rapid-click detection (click < 2s after open = scanner)
    let finalSource = source;
    let finalIsBot = isBot;
    if (eventType === "click" && !isBot) {
      const { data: openRows } = await db
        .from("email_events")
        .select("created_at")
        .eq("dispatch_id", dispatchId)
        .eq("event_type", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (openRows?.length) {
        const openDt = new Date(openRows[0].created_at);
        const delta  = (Date.now() - openDt.getTime()) / 1000;
        if (delta < 2) { finalSource = "scanner"; finalIsBot = true; }
      }
    }

    await db.from("email_events").insert({
      tenant_id,
      campaign_id,
      dispatch_id: dispatchId,
      contact_id:  subscriber_id,
      event_type:  eventType,
      url,
      ip_address:  ip,
      user_agent:  userAgent,
      is_bot:      finalIsBot,
      source:      finalSource,
    });

    console.log(`[TRACK] ${eventType} | dispatch=${dispatchId} | bot=${finalIsBot}`);
  } catch (e) {
    console.error(`[TRACK] Failed to record ${eventType}: ${e}`);
  }
}

// ── Edge Function handler ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  // Supabase may forward either the full path (/functions/v1/track/open/<id>)
  // or just the suffix (/open/<id>). We extract the meaningful segment after
  // the function name "track" (or from root if there's no function prefix).
  const fullPath = url.pathname; // e.g. "/functions/v1/track/open/<id>" or "/open/<id>"
  const match = fullPath.match(/(?:\/track)?\/(open\/.+|click)$/);
  const subPath = match ? match[1] : ""; // "open/<id>" or "click"
  console.log(`[TRACK] pathname=${fullPath} → subPath=${subPath}`);

  // Allow alternate env names because Supabase UI may forbid SUPABASE_* prefix.
  const TRACKING_SECRET =
    Deno.env.get("EDGE_TRACKING_SECRET") ??
    Deno.env.get("TRACKING_SECRET") ??
    "dev-tracking-secret";

  const SUPABASE_URL =
    Deno.env.get("EDGE_SUPABASE_URL") ??
    Deno.env.get("SUPABASE_URL") ??
    "";

  const SERVICE_KEY =
    Deno.env.get("EDGE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  const TEST_BYPASS = (Deno.env.get("TRACKING_TEST_BYPASS") ?? "0") === "1";

  // Hard fail fast if required env vars are missing so it shows up in logs.
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[TRACK] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env; cannot record events");
    return new Response("server not configured", { status: 500 });
  }

  console.log(`[TRACK] cfg url=${SUPABASE_URL ? "set" : "missing"} key=${SERVICE_KEY ? "set" : "missing"} secret=${TRACKING_SECRET ? "set" : "missing"} bypass=${TEST_BYPASS}`);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  // ── Open pixel ──────────────────────────────────────────────────────────────
  if (subPath.startsWith("open/")) {
    const dispatchId = subPath.slice("open/".length);
    const s = url.searchParams.get("s");

    const valid = TEST_BYPASS || await verifySignature(TRACKING_SECRET, dispatchId, s);
    if (!valid) {
      console.warn(`[TRACK] invalid open signature for dispatch ${dispatchId}`);
      return new Response("invalid signature", { status: 400 });
    }

    const { source, isBot } = classifySource(ua, ip, false);
    // Fire-and-forget (don't await — pixel should return instantly)
    recordEvent(db, dispatchId, "open", null, ip, ua, source, isBot);

    return new Response(PIXEL_GIF, {
      status: 200,
      headers: {
        "Content-Type":  "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma":        "no-cache",
      },
    });
  }

  // ── Click redirect ──────────────────────────────────────────────────────────
  if (subPath === "click") {
    const u  = url.searchParams.get("u");
    const d  = url.searchParams.get("d");
    const s  = url.searchParams.get("s");
    const hp = url.searchParams.get("hp") === "1";

    if (!u || !d) return new Response("missing params", { status: 400 });

    // Decode destination URL (base64url, no padding)
    let destination: string;
    try {
      const padded = u + "=".repeat((4 - (u.length % 4)) % 4);
      destination = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      destination = u;
    }

    const valid = TEST_BYPASS || await verifySignature(TRACKING_SECRET, `${d}:${u}`, s);
    if (!valid) {
      console.warn(`[TRACK] invalid click signature for dispatch ${d}`);
      // Still redirect even on bad sig — don't break user experience
      return Response.redirect(destination, 302);
    }

    const { source, isBot } = classifySource(ua, ip, hp);
    recordEvent(db, d, "click", destination, ip, ua, source, isBot);

    return Response.redirect(destination, 302);
  }

  return new Response("not found", { status: 404 });
});
