import { useState, useEffect, useCallback } from "react";
import { Hash, RefreshCw, ExternalLink } from "lucide-react";
import { fetchOdaiTags } from "./lib/api";
import type { OdaiTag, UserTag } from "./types";
import OdaiStatus from "./components/OdaiStatus";
import TagInput from "./components/TagInput";
import TagChip from "./components/TagChip";

const ODAI_LIMIT = 2;

function normalizeTag(raw: string): string {
  return (raw.startsWith("#") ? raw.slice(1) : raw).trim();
}

// i-mobile 広告スロット（クライアント側でスクリプトを注入）
function AdSlotIMobile({ id, pid, mid, asid, className = "" }: {
  id: string;
  pid: number;
  mid: number;
  asid: number;
  className?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = document.getElementById(id);
    if (!container || container.dataset.adLoaded) return;
    container.dataset.adLoaded = "1";

    const spot = document.createElement("script");
    spot.async = true;
    spot.src = "https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104";
    container.appendChild(spot);

    const push = document.createElement("script");
    push.text = `(window.adsbyimobile=window.adsbyimobile||[]).push({pid:${pid},mid:${mid},asid:${asid},type:"banner",display:"inline",elementid:"${id}"})`;
    spot.onload = () => container.appendChild(push);
  }, [id, pid, mid, asid]);

  return (
    <div className={`flex justify-center overflow-hidden ${className}`}>
      <div id={id} />
    </div>
  );
}

// admax（忍者アドマックス）広告スロット
function AdmaxSlot({ id, src, className = "" }: {
  id: string;
  src: string;
  className?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slot = document.getElementById(id);
    if (!slot || slot.dataset.injected) return;
    slot.dataset.injected = "1";
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    slot.appendChild(s);
  }, [id, src]);

  return (
    <div className={`flex justify-center overflow-hidden ${className}`}>
      <div id={id} />
    </div>
  );
}

// A8.net 成果報酬（アフィリエイト）バナー
function A8Banner({ href, imgSrc, pixelSrc, width, height, className = "" }: {
  href: string;
  imgSrc: string;
  pixelSrc: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div className={`flex justify-center ${className}`}>
      <a href={href} rel="nofollow sponsored noopener" target="_blank">
        <img
          src={imgSrc}
          width={width}
          height={height}
          alt=""
          loading="lazy"
          style={{ maxWidth: "100%", height: "auto", border: 0 }}
        />
      </a>
      <img src={pixelSrc} width={1} height={1} alt="" style={{ border: 0 }} />
    </div>
  );
}

export default function App() {
  const [odaiMap, setOdaiMap] = useState<Map<string, OdaiTag>>(new Map());
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadOdaiTags = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await fetchOdaiTags();
      const map = new Map(result.tags.map((t) => [t.name.toLowerCase(), t]));
      setOdaiMap(map);
      setLastSync(result.lastSync);
      setLoadError(result.syncError);
      setUserTags((prev) =>
        prev.map((t) => {
          const odaiInfo = map.get(t.normalized.toLowerCase());
          return { ...t, isOdai: !!odaiInfo, odaiInfo };
        })
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadOdaiTags();
  }, [loadOdaiTags]);

  const addTags = useCallback(
    (rawTags: string[]) => {
      setUserTags((prev) => {
        const existing = new Set(prev.map((t) => t.normalized.toLowerCase()));
        const next: UserTag[] = [];
        for (const raw of rawTags) {
          const normalized = normalizeTag(raw);
          if (!normalized || existing.has(normalized.toLowerCase())) continue;
          existing.add(normalized.toLowerCase());
          const odaiInfo = odaiMap.get(normalized.toLowerCase());
          next.push({
            id: crypto.randomUUID(),
            raw,
            normalized,
            isOdai: !!odaiInfo,
            odaiInfo,
          });
        }
        return [...prev, ...next];
      });
    },
    [odaiMap]
  );

  const removeTag = useCallback((id: string) => {
    setUserTags((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setUserTags([]), []);

  const odaiTags = userTags.filter((t) => t.isOdai);
  const odaiCount = odaiTags.length;
  const isOverLimit = odaiCount > ODAI_LIMIT;

  const sortedTags = [
    ...userTags.filter((t) => t.isOdai),
    ...userTags.filter((t) => !t.isOdai),
  ];

  const formatSync = (s: string | null) => {
    if (!s) return "未取得";
    return new Date(s).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <Hash className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-gray-900">Note お題制限特定ナビ</h1>
              <p className="text-xs text-gray-400">お題タグ自動判定ツール</p>
            </div>
          </div>
          <button
            onClick={loadOdaiTags}
            disabled={isSyncing}
            title="最新のお題タグを取得"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-full hover:border-teal-300 hover:text-teal-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
            <p className="text-sm text-gray-400">Note からお題タグを取得中...</p>
          </div>
        )}

        {/* Description banner */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            お題タグは 2 つまでしかつけられず、記事更新時にどれがお題タグかわからないイライラを解消するためのものです。
          </p>
        </div>

        {/* 成果報酬（A8）468x60 — ページ上部・高視認 */}
        <div>
          <p className="text-[10px] text-gray-300 mb-1 text-center">スポンサーリンク</p>
          <A8Banner
            href="https://px.a8.net/svt/ejp?a8mat=4B7VL2+ANFO3U+52IU+5Z6WX"
            imgSrc="https://www21.a8.net/svt/bgt?aid=260708006644&wid=024&eno=01&mid=s00000023655001004000&mc=1"
            pixelSrc="https://www19.a8.net/0.gif?a8mat=4B7VL2+ANFO3U+52IU+5Z6WX"
            width={468}
            height={60}
          />
        </div>

        {/* Sync warning */}
        {!isLoading && loadError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-medium text-amber-700">同期に問題がありました</p>
            <p className="text-xs text-amber-600 mt-0.5">{loadError}</p>
            <p className="text-xs text-amber-500 mt-1">
              キャッシュ済みのデータで動作しています。
            </p>
          </div>
        )}

        {/* Odai status */}
        {!isLoading && (
          <OdaiStatus
            count={odaiCount}
            isOverLimit={isOverLimit}
            odaiTags={odaiTags}
            onRemove={removeTag}
          />
        )}

        {/* Tag input */}
        {!isLoading && <TagInput onAddTags={addTags} />}

        {/* Tag list */}
        {!isLoading && userTags.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-700">タグ一覧</h2>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {userTags.length}
                </span>
                {odaiCount > 0 && (
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      isOverLimit
                        ? "bg-red-100 text-red-600"
                        : "bg-teal-100 text-teal-600"
                    }`}
                  >
                    お題 {odaiCount}
                  </span>
                )}
              </div>
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                全てクリア
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  isExcessOdai={isOverLimit && tag.isOdai}
                  onRemove={removeTag}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && userTags.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center">
              <Hash className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">タグを入力してください</p>
              <p className="text-xs text-gray-300 mt-1">
                投稿のハッシュタグを貼り付けると、お題タグを自動で判定します
              </p>
            </div>
          </div>
        )}

        {/* 成果報酬（A8）300x250 x3 — メイン操作直後の最注目ポイント（最もクリックされやすい位置） */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[10px] text-gray-300 mb-3 text-center">スポンサーリンク</p>
          <div className="flex flex-wrap justify-center gap-4">
            <A8Banner
              href="https://px.a8.net/svt/ejp?a8mat=4B43JH+8JTMA2+5WBM+5YZ75"
              imgSrc="https://www27.a8.net/svt/bgt?aid=260531693517&wid=024&eno=01&mid=s00000027517001003000&mc=1"
              pixelSrc="https://www14.a8.net/0.gif?a8mat=4B43JH+8JTMA2+5WBM+5YZ75"
              width={300}
              height={250}
            />
            <A8Banner
              href="https://px.a8.net/svt/ejp?a8mat=4B1THS+8SR4CQ+3T6C+NU729"
              imgSrc="https://www29.a8.net/svt/bgt?aid=260425360532&wid=024&eno=01&mid=s00000017778004004000&mc=1"
              pixelSrc="https://www12.a8.net/0.gif?a8mat=4B1THS+8SR4CQ+3T6C+NU729"
              width={300}
              height={250}
            />
            <A8Banner
              href="https://px.a8.net/svt/ejp?a8mat=4AXGGI+AGVWGA+5EX8+609HT"
              imgSrc="https://www25.a8.net/svt/bgt?aid=260221842633&wid=024&eno=01&mid=s00000025262001009000&mc=1"
              pixelSrc="https://www11.a8.net/0.gif?a8mat=4AXGGI+AGVWGA+5EX8+609HT"
              width={300}
              height={250}
            />
          </div>
        </section>

        {/* How-to */}
        {!isLoading && (
          <details className="group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-teal-500 transition-colors list-none flex items-center gap-1 select-none">
              <span className="group-open:hidden">▶ このツールの使い方</span>
              <span className="hidden group-open:inline">▼ このツールの使い方</span>
            </summary>
            <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-5 text-xs text-gray-500 space-y-3 leading-relaxed">
              <p>
                <span className="font-semibold text-gray-700">1. タグを入力</span>
                　Note の投稿に付けるハッシュタグを「まとめて貼り付け」または「1つずつ入力」で追加します。
              </p>
              <p>
                <span className="font-semibold text-gray-700">2. 自動判定</span>

                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                  お題
                </span>
                {" "}
                バッジが付いたタグが、Note のお題・コンテストタグです。
              </p>
              <p>
                <span className="font-semibold text-gray-700">3. 上限チェック</span>
                　お題タグは投稿あたり 2 つまでです。超過すると赤く表示され、削除候補が示されます。
              </p>
              <p>
                <span className="font-semibold text-gray-700">4. 更新について</span>
                　お題リストは 1 時間ごとに自動更新されます。ヘッダーの「更新」ボタンで手動更新も可能です。
              </p>
            </div>
          </details>
        )}

        {/* SEO content: 常時レンダリング（プリレンダHTMLにインデックス可能なテキストを含める） */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mt-2 text-sm text-gray-600 leading-relaxed space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-800">Note のお題タグとは？</h2>
            <p>
              Note（note.com）の「お題」タグとは、note 編集部やパートナー企業が実施する
              コンテスト・お題企画に参加するためのハッシュタグです。対象のお題タグを付けて記事を投稿すると、
              その企画の応募作品として扱われます。通常のハッシュタグと見た目は同じため、
              どのタグがお題タグなのかを見分けるのは簡単ではありません。
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-800">お題タグは1記事に2つまで</h2>
            <p>
              お題タグは1つの記事につき <strong className="text-gray-800">2つまで</strong> しか有効になりません。
              3つ以上のお題タグを付けても、お題としてカウントされるのは2つまでです。
              記事を編集・更新する際に「今つけているタグのうち、どれがお題タグなのか」が分からず、
              意図せず上限を超えてしまうことがあります。
              このツールは、貼り付けたハッシュタグを Note のお題・コンテスト一覧と自動照合し、
              お題タグを特定して2つ制限を超えていないかを瞬時にチェックします。
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800">よくある質問</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800">Q. Note のお題タグは1記事にいくつまで付けられますか？</h3>
                <p className="mt-1">
                  お題（コンテスト）タグは1記事あたり2つまで有効です。3つ以上付けても、お題としてカウントされるのは2つまで。
                  本ツールでは超過時に警告し、削除候補を表示します。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Q. どのハッシュタグがお題タグか、どう見分ければいいですか？</h3>
                <p className="mt-1">
                  見た目だけでお題タグかどうかを判断するのは困難です。本ツールにハッシュタグを貼り付けると、
                  Note のお題・コンテスト一覧と自動照合し、お題タグに「お題」バッジを表示します。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Q. このツールの利用は無料ですか？会員登録は必要ですか？</h3>
                <p className="mt-1">
                  完全無料で、会員登録やログインは不要です。ブラウザで開いてハッシュタグを貼り付けるだけで利用できます。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Q. お題タグのリストはどのくらいの頻度で更新されますか？</h3>
                <p className="mt-1">
                  お題タグのリストは1時間ごとに自動更新されます。画面右上の「更新」ボタンから手動更新も可能です。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* クリック広告（i-mobile x2 + admax）: PCは右側固定サイドバー / モバイルは下部インライン */}
      <aside className="w-full max-w-2xl mx-auto px-5 mt-4 mb-2 space-y-3 xl:mt-0 xl:mb-0 xl:px-0 xl:w-[300px] xl:fixed xl:top-24 xl:right-4 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto z-10">
        <p className="text-[10px] text-gray-300 text-center xl:text-left">スポンサー</p>
        <AdSlotIMobile id="im-8479f1aaa16845efbbc1211b911f7a8b" pid={84386} mid={593350} asid={1933211} />
        <AdSlotIMobile id="im-78ffbac5df3447959f17967106147e4f" pid={84386} mid={593351} asid={1933212} />
        <AdmaxSlot id="admax-6e73a94f0d038af4a36115583362e072" src="https://adm.shinobi.jp/s/6e73a94f0d038af4a36115583362e072" />
      </aside>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-5 pb-12 pt-4">
        <div className="text-center space-y-1.5 text-xs text-gray-400">
          <p>
            作成者:{" "}
            <a
              href="https://note.com/crt03"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-500 hover:text-teal-600 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              crt03
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p>お題リスト最終取得: {formatSync(lastSync)}</p>
          <p className="text-gray-300">※ Note.com の非公式 API を使用しています</p>
        </div>
      </footer>
    </div>
  );
}
