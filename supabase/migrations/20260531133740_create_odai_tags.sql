/*
  # お題タグテーブルの作成

  ## 概要
  Note.com の非公式 API から取得したお題・コンテストタグを
  キャッシュするためのテーブル。

  ## テーブル

  ### odai_tags
  Note.com の /api/v2/contests から取得したタグ情報を保存する。
  - `name`         : # を除いたタグ名（一意キー・比較用）
  - `display_name` : # 付きの表示用タグ名
  - `type`         : タグ種別（"theme" / "contest"）
  - `state`        : 開催状態（"opened" / "closed"）
  - `open_at`      : 開始日時文字列（Note API の形式のまま保存）
  - `close_at`     : 終了日時文字列
  - `synced_at`    : 最後に Note API と同期した日時
  - `created_at`   : レコード作成日時

  ## セキュリティ
  - RLS 有効（サービスロールキーを持つ Edge Function のみアクセス可）
  - anon / authenticated ロール向けのポリシーは設けない
  - データの読み書きは Edge Function 経由のみ
*/

CREATE TABLE IF NOT EXISTS odai_tags (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        UNIQUE NOT NULL,
  display_name text        NOT NULL DEFAULT '',
  type         text        NOT NULL DEFAULT 'contest',
  state        text        NOT NULL DEFAULT 'opened',
  open_at      text,
  close_at     text,
  synced_at    timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE odai_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS odai_tags_name_idx    ON odai_tags (name);
CREATE INDEX IF NOT EXISTS odai_tags_state_idx   ON odai_tags (state);
CREATE INDEX IF NOT EXISTS odai_tags_synced_idx  ON odai_tags (synced_at DESC);
