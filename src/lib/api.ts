import type { OdaiTag } from "../types";

export interface FetchTagsResult {
  tags: OdaiTag[];
  lastSync: string | null;
  syncError: string | null;
}

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/note-odai`;
const AUTH = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` };

export async function fetchOdaiTags(): Promise<FetchTagsResult> {
  const res = await fetch(BASE, { headers: AUTH });
  if (!res.ok) throw new Error(`取得エラー: ${res.status}`);
  return res.json();
}

export async function fetchArticleTags(articleUrl: string): Promise<string[]> {
  const url = `${BASE}?article=${encodeURIComponent(articleUrl)}`;
  const res = await fetch(url, { headers: AUTH });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `エラー: ${res.status}`);
  return data.tags ?? [];
}
