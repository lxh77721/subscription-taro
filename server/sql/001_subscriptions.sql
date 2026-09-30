-- 订阅管家：用户订阅表
-- 在 Supabase / Postgres 中执行一次（SQL Editor 或迁移工具）

CREATE TABLE IF NOT EXISTS subscriptions (
  id            varchar(64) PRIMARY KEY,
  openid        varchar(64)  NOT NULL,
  name          varchar(40)  NOT NULL,
  emoji         varchar(8),
  amount        double precision NOT NULL DEFAULT 0,
  plan_type     varchar(16)  NOT NULL,
  custom_num    integer,
  custom_unit   varchar(8),
  start_date    varchar(10)  NOT NULL,
  end_date      varchar(10),
  remind_days   integer      NOT NULL DEFAULT 0,
  category      varchar(16)  NOT NULL,
  domain        varchar(64),
  payment       varchar(40),
  status        varchar(16)  NOT NULL DEFAULT 'active',
  note          varchar(200),
  created_at    bigint       NOT NULL,
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_openid_idx ON subscriptions (openid);

-- 行级安全（如启用 RLS，按需放开服务端 service_role 访问）
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户资料与偏好配置（按 openid 隔离）
CREATE TABLE IF NOT EXISTS user_profiles (
  openid      varchar(64) PRIMARY KEY,
  nickname    varchar(40)  NOT NULL DEFAULT '',
  avatar_url  varchar(500),
  settings    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
