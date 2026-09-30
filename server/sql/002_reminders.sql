-- 订阅管家：到期提醒表（微信订阅消息推送任务）
-- 在 Supabase / Postgres 中执行一次（SQL Editor 或迁移工具）
-- 注意：应用不会自动建表，缺这张表时「登记提醒 / 发送提醒」会报错

CREATE TABLE IF NOT EXISTS reminders (
  id              varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  openid          varchar(64)  NOT NULL,
  -- 前端订阅本地记录 id，用于幂等去重（另有 __probe__ 为链路自检探针）
  subscription_id varchar(64)  NOT NULL,
  -- 计划下发时间（带时区时间戳）
  remind_at       timestamptz  NOT NULL,
  -- 实际到期日期 YYYY-MM-DD
  due_date        varchar(10)  NOT NULL,
  name            varchar(20)  NOT NULL,
  amount          varchar(16)  NOT NULL DEFAULT '0',
  page            varchar(128) NOT NULL DEFAULT 'pages/index/index',
  template_id     varchar(64),
  -- pending 待发送 / sent 已发送 / failed 死信
  status          varchar(16)  NOT NULL DEFAULT 'pending',
  retry_count     integer      NOT NULL DEFAULT 0,
  last_error      varchar(300),
  created_at      timestamptz  NOT NULL DEFAULT now(),
  sent_at         timestamptz
);

CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders (remind_at, status);
CREATE INDEX IF NOT EXISTS reminders_openid_idx ON reminders (openid);

-- 行级安全（如启用 RLS，按需放开服务端 service_role 访问）
-- ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
