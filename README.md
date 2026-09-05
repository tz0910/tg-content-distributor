# TG Content Distributor

网站文章自动采集、内容处理并自动发布到 Telegram 频道的管理平台。后台名称为「TG 自动发布中心」。

## 已实现功能

- 多采集源：RSS、Sitemap、HTML、JSON API、Webhook。
- 统一 Article 入库流程：采集 → 标准化 → 去重 → 入库 → 路由 → PublishTask → BullMQ Queue → Telegram → 日志回写。
- 去重策略：`externalId`、`canonicalUrl/urlHash`、标题哈希、内容哈希字段预留。
- Telegram：Bot 测试、频道配置、`sendPhoto` 优先、图片失败 fallback 到 `sendMessage`。
- 发布模板：支持 `{{title}}`、`{{summary}}`、`{{url}}`、`{{site_name}}`、`{{category}}`、`{{tags}}`、`{{publish_time}}`、`{{author}}`。
- 路由规则：来源、分类、Tag、标题关键词、URL 关键词、包含/排除关键词、AI 开关。
- 队列与重试：Redis + BullMQ，Worker 独立运行，最多 3 次失败重试。
- 频道限流：最小发布间隔、小时/天限额字段、允许发布时间段字段。
- 后台 UI：Dashboard、采集源、文章池、文章详情、Bot、频道、模板、路由、队列、失败任务、发布日志、采集日志、系统日志、AI 配置。
- 单管理员登录：NextAuth Credentials + bcrypt。
- Docker Compose：`app`、`worker`、`postgres`、`redis`。
- 健康检查：`GET /api/health`。

## 项目目录结构

```txt
src/app                 Next.js App Router 页面和 API
src/components          后台布局与基础 UI
src/lib/ai              OpenAI Compatible AI Provider
src/lib/crawler         Crawler Adapter 与入库去重流程
src/lib/queue           Redis/BullMQ 队列
src/lib/services        模板、路由、发布服务
src/lib/telegram        Telegram Bot API 封装
workers                 crawler / telegram / scheduler 独立 Worker
prisma                  数据库 schema 与 seed
scripts                 备份脚本
tests                   Unit / Integration tests
```

## 数据库结构

Prisma 已定义：`User`、`Source`、`CrawlRule`、`Article`、`TelegramBot`、`TelegramChannel`、`PublishTemplate`、`RouteRule`、`PublishTask`、`PublishLog`、`CrawlLog`、`SystemLog`、`AIConfig`、`Setting`。

核心状态：

- Article：`NEW`、`PROCESSING`、`FILTERED`、`READY`、`QUEUED`、`PUBLISHED`、`FAILED`、`IGNORED`
- PublishTask：`WAITING`、`PROCESSING`、`SUCCESS`、`FAILED`、`RETRYING`、`CANCELLED`

## 环境变量

复制并修改：

```bash
cp .env.example .env
```

重点变量：

```bash
DATABASE_URL=
REDIS_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
APP_URL=
APP_TIMEZONE=Asia/Shanghai
ADMIN_EMAIL=
ADMIN_PASSWORD=
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

`BOT_TOKEN` 不写死在代码中。后台保存 Token 后不会在前端回显。

## 本地启动

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

另开一个终端启动 Worker：

```bash
npm run worker
```

访问：

```txt
http://localhost:3000
```

## Docker 启动

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

查看日志：

```bash
docker compose logs -f app worker
```

## Telegram Bot 配置教程

1. 打开 Telegram，搜索 `@BotFather`。
2. 发送 `/newbot` 创建 Bot。
3. 复制 BotFather 返回的 `BOT_TOKEN`。
4. 将 Bot 加入目标频道。
5. 在频道管理员设置中给 Bot `Post Messages` 权限。
6. 进入后台 `Telegram → Bot`，填写 Token，点击测试并保存。
7. 进入 `Telegram → 频道`，填写频道名称和 `chat_id`。
8. 保存后可用 API `POST /api/telegram/channels/test` 发送测试消息。

公开频道可使用 `@channelusername`。私有频道通常使用 `-100xxxxxxxxx`。

## 获取 Telegram Channel ID

- 公开频道：直接填写 `@channelusername`。
- 私有频道：把 Bot 加入频道并发送一条消息后，通过 Bot API `getUpdates` 查看 `chat.id`，通常以 `-100` 开头。

示例：

```bash
curl "https://api.telegram.org/bot<你的TOKEN>/getUpdates"
```

## 添加第一个 RSS

1. 进入 `采集 → 网站采集源`。
2. 填写网站名称和 Base URL。
3. 类型选择 `RSS`。
4. 填写 RSS URL，例如 `https://example.com/feed`。
5. 采集频率建议 `5` 或 `10` 分钟。
6. 点击新增采集源。
7. 点击 `立即采集`。
8. 到 `文章池` 查看入库文章。

## 添加第一个 Telegram Channel

1. 先在 `Telegram → Bot` 保存 Bot。
2. 进入 `Telegram → 频道`。
3. 选择 Bot。
4. 填写 `@channelusername` 或 `-100xxxxxxxxx`。
5. 设置发布间隔，例如 `60` 秒。
6. 设置允许发布时间，例如 `08:00` 到 `23:00`。
7. 新增频道。

## 建立自动发布流程

1. 在 `发布模板` 创建模板。
2. 在 `路由规则` 选择 Source、Channel、Template。
3. 设置分类、Tag、关键词过滤。
4. 后续采集到的新文章会自动匹配路由并生成 PublishTask。
5. Worker 会从 `telegram-publish` 队列消费任务并发布到 Telegram。

## Webhook

自己的站点推荐用 Webhook，避免反复爬取。

```http
POST /api/webhooks/articles/{sourceId}
X-Webhook-Secret: your-secret
Content-Type: application/json
```

```json
{
  "externalId": "12345",
  "title": "文章标题",
  "url": "https://example.com/12345",
  "excerpt": "文章摘要",
  "content": "正文",
  "cover": "https://example.com/image.jpg",
  "category": "热点",
  "tags": ["热点", "娱乐"],
  "publishedAt": "2026-09-03T10:00:00Z"
}
```

## HTML Selector 配置

创建 `CrawlRule` 后，HTML Adapter 支持：

- `articleSelector`
- `titleSelector`
- `linkSelector`
- `imageSelector`
- `timeSelector`
- `detailContentSelector`

正文清洗会删除 `script`、`style`、`iframe`，正文最多保留 20,000 字符给 AI。

## Sitemap 配置

支持 `sitemap.xml` 和 `sitemap_index.xml`。首次采集默认只取最新 20 条，避免一次抓取大量历史文章。

## VPS 部署

目标系统：Ubuntu 22.04 / 24.04。

```bash
git clone <repo-url>
cd tg-content-distributor
cp .env.example .env
nano .env
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Nginx 反代示例：

```nginx
server {
  server_name tg.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

SSL：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tg.example.com
```

## 备份

`scripts/backup.sh` 使用 `pg_dump` 备份 PostgreSQL，默认保留 7 天。

```bash
chmod +x scripts/backup.sh
BACKUP_DIR=/backups DATABASE_URL="postgresql://..." scripts/backup.sh
```

可加入 crontab 每日执行。

## 常见错误

- `Telegram Bot 无管理员权限`：确认 Bot 已加入频道并拥有 `Post Messages`。
- `chat not found`：公开频道用 `@username`，私有频道用 `-100` 开头 ID。
- `AI_API_KEY 未配置`：系统会自动 fallback 到原始标题和摘要，不会阻断发布。
- `Redis error`：确认 `REDIS_URL` 可连接，Docker 下默认是 `redis://redis:6379`。
- `Prisma migrate failed`：确认 `DATABASE_URL` 正确，PostgreSQL 已启动。

## 当前已知限制

- Token 加密层已预留，当前第一版以服务器环境和数据库访问控制为主，正式多租户前建议接入 KMS/libsodium。
- Playwright 动态采集保留 `DYNAMIC_HTML` 类型入口，默认不启用。
- 后台 CRUD 覆盖核心新增和查看，复杂编辑、批量操作和可视化采集规则测试可继续增强。
- robots.txt 保护字段已建模，HTML Adapter 下一步可加入完整 robots 解析。

## 后续可扩展功能

- 多管理员与权限分级。
- 可视化 HTML Selector 测试器。
- Gemini / Claude / DeepSeek Provider。
- 更细的频道每小时/每日限额执行器。
- Telegram 消息删除、更新、补发版本管理。
- GA4/UTM 转化统计报表。
