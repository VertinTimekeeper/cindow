# Vidora（占位名）

个人练习用的视频社区站骨架。方案见 [PLAN.md](PLAN.md)，架构与多执行者协作见 [docs/architecture-handbook.md](docs/architecture-handbook.md)。

## 快速开始

```bash
npm install
npx prisma db push                 # 建库（SQLite: prisma/dev.db）
bash scripts/make-sample-media.sh  # 用 ffmpeg 合成 6 条示例视频（没有 ffmpeg 会跳过）
npx tsx prisma/seed.ts             # 演示数据
npm run dev                        # http://localhost:3000
```

或一条命令：`npm run setup && npm run dev`

演示账号：`demo@vidora.local` / `vidora1234`

## 技术栈

Next.js（App Router）+ TypeScript + Tailwind CSS + Prisma + SQLite（本地）/ PostgreSQL（生产）+ ffmpeg（转码）。

## 目录

```
src/app/          页面与 API（首页 / 分区 / 搜索 / 播放 / 个人主页 / 创作中心 / 登录）
src/components/   共用组件（播放器、弹幕层、信息流、评论…）
src/lib/          数据访问、认证、媒体处理、格式化
prisma/           schema 与种子数据
db/               生产库（PostgreSQL）字段级草案
scripts/          示例媒体生成、迁移检查
storage/          运行时媒体目录（已 gitignore）
```

## 已知限制

- 上传文件整体读入内存后落盘，建议单文件 < 500MB。
- 转码在请求内同步执行，生产应拆到 worker。
- 点赞/投币/收藏仅展示计数，接口未实现。
- 媒体文件存在本地磁盘，多机部署前必须换对象存储。
