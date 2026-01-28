# Reviewer 部署指南

## 生产环境

- **URL**: https://copilot.wildmeta.ai/reviewer
- **服务器**: ubuntu@15.235.212.36
- **应用目录**: /home/ubuntu/apps/reviewer
- **端口**: 38964
- **PM2 进程名**: reviewer-web
- **反向代理**: Nginx sub path `/reviewer`
- **数据库**: 共享 `seeder` 数据库（与 seeder、farmer 共用）

## 完整部署流程

### 场景一：代码更新（无数据库变更）

```bash
# 一行命令部署
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && \
  git pull origin main && \
  npm ci && \
  npm run build && \
  pm2 restart reviewer-web"
```

或使用本地脚本：
```bash
./deploy.sh
```

### 场景二：首次部署

```bash
# 1. 创建目录
ssh ubuntu@15.235.212.36 "mkdir -p /home/ubuntu/apps/reviewer"

# 2. 推送代码
scp -r /Users/yoshiyuki/WebstormProjects/reviewer/* ubuntu@15.235.212.36:/home/ubuntu/apps/reviewer/

# 3. 安装依赖并构建
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && npm ci && npm run build"

# 4. 启动服务
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && pm2 start ecosystem.config.js && pm2 save"

# 5. 配置 Nginx（参考下方配置）
```

### 场景三：需要完全重建

```bash
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && \
  git pull origin main && \
  rm -rf .next node_modules/.cache && \
  npm ci && \
  npm run build && \
  pm2 delete reviewer-web 2>/dev/null; \
  PORT=38964 pm2 start npm --name reviewer-web -- run start && \
  pm2 save"
```

## 验证部署

```bash
# 检查服务状态
ssh ubuntu@15.235.212.36 "pm2 list | grep reviewer"

# 检查启动日志
ssh ubuntu@15.235.212.36 "pm2 logs reviewer-web --nostream --lines 50"

# 测试 API 端点
curl https://copilot.wildmeta.ai/reviewer/api/stats

# 浏览器访问
# https://copilot.wildmeta.ai/reviewer
```

## 常用运维命令

```bash
# 查看服务状态
ssh ubuntu@15.235.212.36 "pm2 status"

# 查看日志
ssh ubuntu@15.235.212.36 "pm2 logs reviewer-web --nostream --lines 50"

# 重启服务
ssh ubuntu@15.235.212.36 "pm2 restart reviewer-web"

# 停止服务
ssh ubuntu@15.235.212.36 "pm2 stop reviewer-web"

# 保存 PM2 进程列表
ssh ubuntu@15.235.212.36 "pm2 save"
```

## 常见问题

### 问题1: 数据库连接失败

**检查数据库连接字符串是否正确**：
```bash
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && cat .env | grep DATABASE_URL"
```

### 问题2: 端口已被占用

```bash
# 查看端口占用
ssh ubuntu@15.235.212.36 "lsof -i :38964"
ssh ubuntu@15.235.212.36 "lsof -i :38965"

# 如需释放端口
ssh ubuntu@15.235.212.36 "pm2 stop reviewer-web"
```

### 问题3: 构建失败

```bash
# 清理缓存后重新构建
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && \
  rm -rf .next node_modules/.cache && \
  npm ci && \
  npm run build"
```

## Nginx Sub Path 配置

```nginx
location /reviewer {
    proxy_pass http://127.0.0.1:38964;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
}
```

## 环境变量说明

`.env` 必须包含：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接（与 seeder 共用） | `postgresql://hbot:hummingbot-api@localhost:5432/seeder` |
| `AUTH_SECRET` | JWT 密钥 | `seedbed-dev-secret-change-in-production` |
| `PORT` | Web 服务端口 | `38964` |
| `NODE_ENV` | 环境 | `production` |
| `NEXT_PUBLIC_BASE_PATH` | 应用基础路径 | `/reviewer`（构建时烘焙，修改后需重新构建） |
| `GITHUB_TOKEN` | GitHub API 访问令牌 | (可选) |

## 数据库

- **类型**: PostgreSQL (Docker)
- **连接**: `postgresql://hbot:hummingbot-api@localhost:5432/seeder`
- **说明**: 该地址仅适用于服务器 Docker 网络环境，本地开发请使用本地数据库

```bash
# 进入数据库
ssh ubuntu@15.235.212.36 "docker exec -it hummingbot-postgres psql -U hbot -d seeder"
```

### 数据库迁移

```bash
# 推送 schema 变更
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && npx prisma db push"

# 生成 Prisma Client
ssh ubuntu@15.235.212.36 "cd /home/ubuntu/apps/reviewer && npx prisma generate"
```

### 检查枚举值

```bash
ssh ubuntu@15.235.212.36 "docker exec hummingbot-postgres psql -U hbot -d seeder -c \"SELECT enum_range(NULL::\\\"ReviewStatus\\\");\""
```

**注意**: 当 Prisma schema 中的 enum 新增值时，需要在所有环境（本地、生产）手动添加枚举值。