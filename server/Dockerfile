# 订阅管家后端（NestJS）
# 多阶段构建：第一阶段装全量依赖并编译，第二阶段只保留运行时依赖

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=builder /app/dist ./dist
COPY sql ./sql
# 提醒与用户资料的文件落盘目录（未配置数据库时使用）
VOLUME ["/app/.data"]
EXPOSE 3000
CMD ["node", "dist/main"]
