-- Vidora 生产环境数据模型草案（PostgreSQL 16+）
-- 与 prisma/schema.prisma 对应；差异点：
--   1. 枚举用原生 enum 类型，避免魔法字符串
--   2. 标签/多值字段用 text[] 或 jsonb
--   3. 播放进度、弹幕用更适合的数值类型并加复合索引
-- 本文件是设计草案，不参与本地骨架运行（本地用 Prisma + SQLite）

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== 用户 ==========
CREATE TYPE user_role AS ENUM ('user', 'creator', 'admin');

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext UNIQUE NOT NULL,
  username       varchar(32) UNIQUE NOT NULL,
  display_name   varchar(64) NOT NULL,
  password_hash  text NOT NULL,
  avatar_url     text,
  bio            varchar(200),
  role           user_role NOT NULL DEFAULT 'user',
  coin_balance   integer NOT NULL DEFAULT 0,   -- 站内硬币余额
  follower_count integer NOT NULL DEFAULT 0,   -- 冗余计数，避免实时 count
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         text PRIMARY KEY,                -- 256bit 随机串
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent text,
  ip         inet,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- ========== 分区 / 标签 ==========
CREATE TABLE categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(32) NOT NULL,
  slug varchar(32) UNIQUE NOT NULL,
  sort integer NOT NULL DEFAULT 0
);

CREATE TABLE tags (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(32) UNIQUE NOT NULL,
  slug varchar(32) UNIQUE NOT NULL
);

-- ========== 视频 ==========
CREATE TYPE video_status AS ENUM ('draft', 'processing', 'published', 'rejected');
CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'private');

CREATE TABLE videos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          varchar(120) NOT NULL,
  description    text NOT NULL DEFAULT '',
  cover_url      text,
  duration_sec   integer NOT NULL DEFAULT 0,
  status         video_status NOT NULL DEFAULT 'processing',
  visibility     video_visibility NOT NULL DEFAULT 'public',
  category_id    uuid REFERENCES categories(id),
  is_original    boolean NOT NULL DEFAULT true,
  -- 冗余计数：写入时 +1/-1，读取零成本；定时任务兜底校正
  view_count     bigint  NOT NULL DEFAULT 0,
  like_count     integer NOT NULL DEFAULT 0,
  coin_count     integer NOT NULL DEFAULT 0,
  favorite_count integer NOT NULL DEFAULT 0,
  comment_count  integer NOT NULL DEFAULT 0,
  danmaku_count  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX videos_feed_idx   ON videos (status, visibility, published_at DESC);
CREATE INDEX videos_author_idx ON videos (author_id, created_at DESC);
CREATE INDEX videos_cat_idx    ON videos (category_id, published_at DESC);
-- 全文检索：中文场景先用 pg_trgm，量级上来后换 Meilisearch（见 PLAN.md）
CREATE INDEX videos_title_trgm ON videos USING gin (title gin_trgm_ops);

CREATE TABLE video_sources (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id  uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  label     varchar(16) NOT NULL,       -- 360p / 480p / 720p / 1080p
  width     integer NOT NULL,
  height    integer NOT NULL,
  bitrate   integer NOT NULL DEFAULT 0,
  filesize  bigint  NOT NULL DEFAULT 0,
  url       text NOT NULL,              -- 对象存储或 CDN 地址
  UNIQUE (video_id, label)
);

CREATE TABLE video_tags (
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  tag_id   uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- ========== 评论 ==========
CREATE TABLE comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES comments(id) ON DELETE CASCADE,  -- 仅两级：父评论 + 回复
  root_id    uuid REFERENCES comments(id) ON DELETE CASCADE,  -- 冗余根评论，便于按楼聚合
  content    text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX comments_video_idx ON comments (video_id, root_id NULLS FIRST, created_at DESC);

-- ========== 弹幕 ==========
CREATE TYPE danmaku_mode AS ENUM ('scroll', 'top', 'bottom');

CREATE TABLE danmaku (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  content    varchar(100) NOT NULL,
  time_sec   numeric(8,2) NOT NULL,     -- 出现时间点
  color      varchar(7) NOT NULL DEFAULT '#ffffff',
  mode       danmaku_mode NOT NULL DEFAULT 'scroll',
  font_size  smallint NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 拉弹幕永远是「按视频取一段时间窗」，这个复合索引是弹幕性能的关键
CREATE INDEX danmaku_video_time_idx ON danmaku (video_id, time_sec);

-- ========== 互动关系 ==========
CREATE TABLE video_likes (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX video_likes_video_idx ON video_likes (video_id);

CREATE TABLE coins (
  user_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  amount   smallint NOT NULL DEFAULT 1 CHECK (amount BETWEEN 1 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE favorites (
  user_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  folder   varchar(32) NOT NULL DEFAULT '默认收藏夹',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE follows (
  follower_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON follows (following_id);

CREATE TABLE watch_history (
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  video_id     uuid REFERENCES videos(id) ON DELETE CASCADE,
  progress_sec integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- ========== 审核 / 举报 ==========
CREATE TYPE report_status AS ENUM ('pending', 'handled', 'dismissed');

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type varchar(16) NOT NULL,     -- video | comment | user
  target_id   uuid NOT NULL,
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reason      varchar(32) NOT NULL,
  detail      text,
  status      report_status NOT NULL DEFAULT 'pending',
  handled_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON reports (status, created_at DESC);
