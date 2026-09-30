#!/bin/bash
# 订阅管家后端 —— 数据库栈一键部署
#
# 背景：后端通过 @supabase/supabase-js 访问数据库（PostgREST 协议的 HTTP 接口，
# 路径固定为 /rest/v1/<表>），所以不能只起一个 Postgres，需要：
#   Postgres（存数据） + PostgREST（HTTP 层） + nginx（把 /rest/v1 转发给 PostgREST）
#
# 用法（在目标服务器上，当前目录为 server/）：
#   bash deploy/db-stack.sh
# 完成后把输出的 COZE_SUPABASE_URL / COZE_SUPABASE_ANON_KEY 写入 server/.env，
# 并重建后端容器（--env-file 在容器创建时固化，restart 不会重读 .env）。
#
# 注意：CentOS 7（内核 3.10）上不要用 postgres 的 alpine 版，musl 与老内核不兼容，
# 会出现 could not write to file "postmaster.pid": Operation not permitted。

set -e

PG_PASSWORD="${PG_PASSWORD:-SubPass2026}"
PG_DB="${PG_DB:-subscription}"
PG_DATA="${PG_DATA:-/root/sub-db}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
NET_NAME=sub-net
SQL_DIR="$(cd "$(dirname "$0")/../sql" && pwd)"

echo "=== 0. 网络 ==="
docker network create $NET_NAME 2>/dev/null || true

echo "=== 1. Postgres ==="
docker rm -f sub-db 2>/dev/null || true
mkdir -p "$PG_DATA" && chmod 777 "$PG_DATA"
docker run -d \
  --name sub-db \
  --network $NET_NAME \
  --restart unless-stopped \
  -e "POSTGRES_PASSWORD=$PG_PASSWORD" \
  -e "POSTGRES_DB=$PG_DB" \
  -v "$PG_DATA:/var/lib/postgresql/data" \
  postgres:16 > /dev/null

echo "等待 Postgres 就绪..."
for i in $(seq 1 60); do
  docker exec sub-db pg_isready -U postgres > /dev/null 2>&1 && break
  sleep 1
done

echo "=== 2. 角色与授权 ==="
docker exec -i sub-db psql -U postgres -d "$PG_DB" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
SQL

echo "=== 3. 建表 ==="
docker exec -i sub-db psql -U postgres -d "$PG_DB" -v ON_ERROR_STOP=1 < "$SQL_DIR/001_subscriptions.sql"
docker exec -i sub-db psql -U postgres -d "$PG_DB" -v ON_ERROR_STOP=1 < "$SQL_DIR/002_reminders.sql"
docker exec sub-db psql -U postgres -d "$PG_DB" -c '\dt'

echo "=== 4. PostgREST ==="
docker rm -f sub-postgrest 2>/dev/null || true
docker run -d \
  --name sub-postgrest \
  --network $NET_NAME \
  --restart unless-stopped \
  -e "PGRST_DB_URI=postgres://postgres:$PG_PASSWORD@sub-db:5432/$PG_DB" \
  -e PGRST_DB_SCHEMAS=public \
  -e PGRST_DB_ANON_ROLE=anon \
  -e "PGRST_JWT_SECRET=$JWT_SECRET" \
  -e PGRST_DB_MAX_ROWS=1000 \
  postgrest/postgrest:v12.2.0 > /dev/null

echo "=== 5. nginx 转发层 ==="
cat > /root/nginx-rest.conf <<'CONF'
server {
  listen 80;
  server_name _;

  location /rest/v1/ {
    proxy_pass http://sub-postgrest:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    return 404 'not found';
  }
}
CONF

docker rm -f sub-db-api 2>/dev/null || true
docker run -d \
  --name sub-db-api \
  --network $NET_NAME \
  --restart unless-stopped \
  -v /root/nginx-rest.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:latest > /dev/null

echo "=== 6. 生成 anon key（HS256 JWT，role=anon）==="
b64() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
H=$(printf '{"alg":"HS256","typ":"JWT"}' | b64)
IAT=$(date +%s)
EXP=$((IAT + 315360000))
P=$(printf '{"iss":"supabase","role":"anon","iat":%s,"exp":%s}' "$IAT" "$EXP" | b64)
S=$(printf '%s.%s' "$H" "$P" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64)
ANON="$H.$P.$S"

sleep 5
echo "=== 7. 自检 ==="
docker exec sub-db-api curl -s -o /dev/null -w 'REST 状态码: %{http_code} (200=正常)\n' \
  -H "Authorization: Bearer $ANON" \
  "http://sub-postgrest:3000/subscriptions?select=id&limit=1"

echo
echo "=========== 请把下面两行写入 server/.env ==========="
echo "COZE_SUPABASE_URL=http://sub-db-api"
echo "COZE_SUPABASE_ANON_KEY=$ANON"
echo "===================================================="
echo
echo "然后重建后端容器（后端需加入 $NET_NAME 网络才能访问 sub-db-api）："
echo "  docker network connect $NET_NAME subscription-server"
echo "  docker rm -f subscription-server"
echo "  docker run -d --name subscription-server --restart unless-stopped \\"
echo "    --network $NET_NAME -p 3000:3000 \\"
echo "    -v /root/subscription-server/.data:/app/.data \\"
echo "    --env-file /root/subscription-server/.env subscription-server:latest"
