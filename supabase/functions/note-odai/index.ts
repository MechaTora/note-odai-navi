import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

interface ContestItem {
  id?: number;
  name?: string;
  hashtag?: { name?: string };
  type?: string;
  state?: string;
  openAt?: string;
  closeAt?: string;
}

function normalizeName(raw: string): string {
  return (raw.startsWith("#") ? raw.slice(1) : raw).trim();
}

async function syncTags(supabase: ReturnType<typeof createClient>): Promise<void> {
  const res = await fetch("https://note.com/api/v2/contests", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      Referer: "https://note.com/",
    },
  });
  if (!res.ok) throw new Error(`Note API error: ${res.status}`);

  const json = await res.json();
  const contests: ContestItem[] = json?.data?.contests ?? [];

  const synced_at = new Date().toISOString();
  const seen = new Map<string, object>();
  for (const c of contests) {
    const raw = c.name || c.hashtag?.name || "";
    if (!raw) continue;
    const name = normalizeName(raw);
    if (!name) continue;
    if (!seen.has(name) || c.state === "opened") {
      seen.set(name, {
        name,
        display_name: raw.startsWith("#") ? raw : `#${raw}`,
        type: c.type || "contest",
        state: c.state || "opened",
        open_at: c.openAt || null,
        close_at: c.closeAt || null,
        synced_at,
      });
    }
  }
  const tags = [...seen.values()];

  if (tags.length > 0) {
    const { error } = await supabase
      .from("odai_tags")
      .upsert(tags, { onConflict: "name" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  return tags.length;
}

// Extract note key from URL like https://note.com/username/n/nXXXXXX
function extractNoteKey(urlOrKey: string): string | null {
  const m = urlOrKey.match(/\/n\/(n[a-f0-9]+)/i);
  if (m) return m[1];
  // bare key like n6f6401046296
  if (/^n[a-f0-9]+$/i.test(urlOrKey.trim())) return urlOrKey.trim();
  return null;
}

async function fetchArticleTags(urlOrKey: string): Promise<string[]> {
  const key = extractNoteKey(urlOrKey);
  if (!key) throw new Error("有効なNote記事URLまたはキーではありません");

  const res = await fetch(`https://note.com/api/v3/notes/${key}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      Referer: "https://note.com/",
    },
  });
  if (!res.ok) throw new Error(`Note API error: ${res.status}`);

  const json = await res.json();
  // v3 API: hashtag_notes[].hashtag.name
  const hashtagNotes: any[] = json?.data?.hashtag_notes ?? [];
  return hashtagNotes
    .map((h: any) => h?.hashtag?.name ?? "")
    .filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);

    // Article tag fetch: ?article=<note url or key>
    if (url.searchParams.has("article")) {
      const articleParam = url.searchParams.get("article")!;
      try {
        const tags = await fetchArticleTags(articleParam);
        return new Response(JSON.stringify({ tags }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "取得失敗";
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Main: return お題 tag list (sync if stale)
    const { data: latest } = await supabase
      .from("odai_tags")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isStale =
      !latest ||
      Date.now() - new Date(latest.synced_at).getTime() > SYNC_INTERVAL_MS;

    let syncError: string | null = null;
    if (isStale) {
      try {
        await syncTags(supabase);
      } catch (e) {
        syncError = e instanceof Error ? e.message : "同期に失敗しました";
      }
    }

    const { data: tags, error } = await supabase
      .from("odai_tags")
      .select("name, display_name, type, state, open_at, close_at, synced_at")
      .order("name");

    if (error) throw error;

    const lastSync =
      tags && tags.length > 0
        ? tags.reduce(
            (max, t) =>
              new Date(t.synced_at) > new Date(max) ? t.synced_at : max,
            tags[0].synced_at
          )
        : null;

    return new Response(
      JSON.stringify({ tags: tags ?? [], lastSync, syncError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
