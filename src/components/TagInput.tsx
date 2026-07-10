import { useState } from "react";
import { Plus, ClipboardList, Pencil, Link } from "lucide-react";
import { fetchArticleTags } from "../lib/api";

interface Props {
  onAddTags: (tags: string[]) => void;
}

type Mode = "paste" | "manual" | "url";

function parseTagsFromText(text: string): string[] {
  // Try # prefixed tokens first
  const withHash = text.match(/#[^\s#\u3001\u3002、。\n\r,，]+/g) ?? [];
  if (withHash.length > 0) return [...new Set(withHash)];

  // Fallback: treat each non-empty line/word as a tag name (without #)
  const words = text
    .split(/[\s\u3001\u3002、。\n\r,，]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .map((w) => (w.startsWith("#") ? w : `#${w}`));
  return [...new Set(words)];
}

export default function TagInput({ onAddTags }: Props) {
  const [mode, setMode] = useState<Mode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const detectedCount = parseTagsFromText(pasteText).length;

  const handlePasteLoad = () => {
    const tags = parseTagsFromText(pasteText);
    if (tags.length === 0) return;
    onAddTags(tags);
    setPasteText("");
  };

  const handleManualAdd = () => {
    const raw = manualInput.trim();
    if (!raw) return;
    onAddTags([raw.startsWith("#") ? raw : `#${raw}`]);
    setManualInput("");
  };

  const handleUrlFetch = async () => {
    const val = articleUrl.trim();
    if (!val) return;
    setIsUrlLoading(true);
    setUrlError(null);
    try {
      const tags = await fetchArticleTags(val);
      if (tags.length === 0) {
        setUrlError("この記事にはタグが設定されていません。");
      } else {
        onAddTags(tags.map((t) => (t.startsWith("#") ? t : `#${t}`)));
        setArticleUrl("");
      }
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setIsUrlLoading(false);
    }
  };

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "url", label: "URLから取得", icon: <Link className="w-4 h-4" /> },
    { key: "paste", label: "まとめて貼り付け", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "manual", label: "1つずつ入力", icon: <Pencil className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium whitespace-nowrap px-3 transition-colors ${
              mode === t.key
                ? "text-teal-600 border-b-2 border-teal-500 bg-teal-50/50"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* URL fetch mode */}
        {mode === "url" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Note 記事の URL を貼り付けると、その記事のタグを自動で読み込みます。
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => { setArticleUrl(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                placeholder="https://note.com/username/n/n..."
                className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none py-1 min-w-0"
              />
              <button
                onClick={handleUrlFetch}
                disabled={!articleUrl.trim() || isUrlLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-full hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isUrlLoading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                取得
              </button>
            </div>
            {urlError && (
              <p className="text-xs text-red-500">{urlError}</p>
            )}
          </div>
        )}

        {/* Paste mode */}
        {mode === "paste" && (
          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`例: #エッセイ #今日の振り返り #日記\n\n#付きのタグをそのまま貼り付けてください。`}
              className="w-full h-28 text-sm text-gray-700 placeholder-gray-300 resize-none outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">
                {detectedCount > 0 ? `${detectedCount} 個のタグを検出` : ""}
              </span>
              <button
                onClick={handlePasteLoad}
                disabled={detectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-full hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                タグを読み込む
              </button>
            </div>
          </div>
        )}

        {/* Manual mode */}
        {mode === "manual" && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
              placeholder="タグ名を入力（# は省略可）"
              className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none py-1"
              autoFocus
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-full hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
