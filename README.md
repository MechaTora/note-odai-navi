# Note お題制限特定ナビ

Note.com のお題・コンテストタグを自動判定し、1記事あたり **2つまで** というお題タグの制限を管理するための Web ツールです。ハッシュタグをまとめて貼り付けるだけで、どれがお題タグかを瞬時に判定します。

本番サイト: https://noteodainavi.vercel.app/

## 主な機能

- **お題タグの自動判定** — 入力したハッシュタグのうち、Note のお題・コンテストタグに該当するものへ「お題」バッジを付与します。
- **2つ制限のチェック** — お題タグが上限（2つ）を超えると赤く警告し、削除候補を提示します。
- **3つの入力方法** — 記事URLから取得 / まとめて貼り付け / 1つずつ入力。
- **お題リストの自動同期** — Note.com の非公式 API から1時間ごとにお題タグを取得し、Supabase にキャッシュします。

## 技術構成

- **フロントエンド**: Vite + React 18 + TypeScript + Tailwind CSS（アイコンは lucide-react）
- **SSR / プリレンダリング**: `entry-server.tsx` + `prerender.js` によるビルド時プリレンダ（SEO向けに初期HTMLを生成）
- **バックエンド**: Supabase Edge Function（`supabase/functions/note-odai`）＋ Postgres テーブル `odai_tags`
- **デプロイ**: Vercel（`dist/_redirects` による SPA フォールバック）

## セットアップ

```bash
npm install
```

`.env` に Supabase の接続情報を設定します（コミットしないこと）:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド（クライアント + SSR + プリレンダ）
npm run preview    # ビルド結果のプレビュー
npm run typecheck  # 型チェック（tsc --noEmit）
npm run lint       # ESLint
```

## ディレクトリ構成

```
src/
  App.tsx              メインUI・状態管理
  components/
    OdaiStatus.tsx     お題タグ使用状況の表示
    TagInput.tsx       タグ入力（URL/貼り付け/手動の3モード）
    TagChip.tsx        タグチップ表示
  lib/api.ts           Edge Function 呼び出し
  types.ts             型定義
  entry-server.tsx     SSRエントリ（プリレンダ用）
  main.tsx             クライアントエントリ（hydrate）
supabase/
  functions/note-odai/ Note API 取得＋キャッシュを行う Edge Function
  migrations/          odai_tags テーブル定義
public/                静的アセット（icon / robots / sitemap / OGP画像）
prerender.js           ビルド後に index.html へ初期HTMLを埋め込む
```

## Supabase Edge Function

`note-odai` は2つのモードを持ちます。

- 引数なし: `odai_tags` テーブルのお題タグ一覧を返す（1時間以上古い場合は Note API から再同期）
- `?article=<Note記事URL>`: 指定記事に付いているハッシュタグ一覧を返す

Note.com の非公式 API（`/api/v2/contests`, `/api/v3/notes/:key`）を利用しています。API 仕様変更で動作しなくなる可能性がある点に留意してください。

## 制作者

[crt03](https://note.com/crt03)
