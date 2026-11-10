/**
 * 种子数据：一份可浏览的演示内容（6 个视频、弹幕、评论、标签）
 * 运行：npm run db:seed   （需先 npm run db:push）
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "vidora1234";

type SeedVideo = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  durationSec: number;
  views: number;
};

const VIDEOS: SeedVideo[] = [
  {
    slug: "seed-01",
    title: "把出租屋的两平米阳台改成能坐下来的小花园",
    description:
      "预算 800 块，三个月时间。记录从量尺寸、搭架子到第一朵花开的全过程。附上踩过的坑：防水、承重和朝向。",
    category: "生活",
    tags: ["改造", "vlog", "租房"],
    author: "lin",
    durationSec: 14,
    views: 12840,
  },
  {
    slug: "seed-02",
    title: "为什么雨后的空气闻起来不一样？",
    description: "从放线菌到土臭素，聊聊那股「雨后味道」到底从哪来，以及鼻子为什么对它这么敏感。",
    category: "知识",
    tags: ["科普", "化学", "自然"],
    author: "mo",
    durationSec: 11,
    views: 9342,
  },
  {
    slug: "seed-03",
    title: "用 200 行代码写一个能用的命令行待办",
    description: "不装框架、不引依赖，只用标准库。适合刚学完语法、想找个真实小项目练手的人。",
    category: "科技",
    tags: ["编程", "入门", "命令行"],
    author: "kai",
    durationSec: 16,
    views: 24517,
  },
  {
    slug: "seed-04",
    title: "手冲咖啡：水温、研磨度、时间到底哪个先调",
    description: "同一支豆子冲 12 杯，只改一个变量，用味道差异说明参数之间的先后顺序。",
    category: "生活",
    tags: ["咖啡", "教程"],
    author: "lin",
    durationSec: 9,
    views: 5321,
  },
  {
    slug: "seed-05",
    title: "合成器入门：一切从一条正弦波开始",
    description: "不用任何乐理，先听正弦波，再叠泛音、加包络，最后你会得到一个很像样的音色。",
    category: "音乐",
    tags: ["音乐制作", "合成器", "入门"],
    author: "mo",
    durationSec: 13,
    views: 7810,
  },
  {
    slug: "seed-06",
    title: "十分钟动画分镜练习：一个动作拆成八格",
    description: "拿一个日常动作做拆解，重点不是画得好看，而是让观众看懂力量往哪走。",
    category: "动画",
    tags: ["动画", "分镜", "练习"],
    author: "demo",
    durationSec: 10,
    views: 3268,
  },
];

const CATEGORIES = [
  { name: "动画", slug: "animation", sort: 1 },
  { name: "知识", slug: "knowledge", sort: 2 },
  { name: "生活", slug: "life", sort: 3 },
  { name: "音乐", slug: "music", sort: 4 },
  { name: "科技", slug: "tech", sort: 5 },
  { name: "游戏", slug: "game", sort: 6 },
];

const USERS = [
  { username: "demo", displayName: "演示账号", email: "demo@vidora.local", bio: "骨架工程的默认账号" },
  { username: "lin", displayName: "林与", email: "lin@vidora.local", bio: "拍生活，也拍失败的生活" },
  { username: "mo", displayName: "莫名", email: "mo@vidora.local", bio: "科普 / 声音" },
  { username: "kai", displayName: "Kai", email: "kai@vidora.local", bio: "写代码，偶尔讲给别人听" },
];

const DANMAKU: Record<string, Array<[number, string, string?]>> = {
  "seed-01": [
    [1.2, "这个架子是自己焊的吗"],
    [2.6, "防水用的什么材料呀"],
    [4.1, "朝北的阳台能种什么", "#9fd8d0"],
    [5.8, "前面这段加速太真实了"],
    [7.2, "求架子链接"],
    [8.5, "已经跟着改了，感谢"],
    [10.1, "预算控制得真好"],
    [12.4, "等一个第二年开花"],
  ],
  "seed-02": [
    [1.0, "土臭素！我记住这个词了"],
    [3.2, "所以是细菌的味道？"],
    [4.9, "难怪下雨前也会闻到", "#f0d8b0"],
    [6.4, "鼻子敏感这段有意思"],
    [8.0, "求参考文献"],
    [9.6, "讲得比课本清楚"],
  ],
  "seed-03": [
    [0.8, "标准库党狂喜"],
    [2.4, "能换成 Rust 吗"],
    [3.9, "200 行有点猛"],
    [5.5, "这个参数解析写得好干净"],
    [7.1, "收藏了，周末跟着敲"],
    [8.8, "有没有仓库地址"],
    [10.2, "命令行配色是哪个主题"],
    [11.6, "讲得真细"],
    [13.0, "已 star"],
  ],
  "seed-04": [
    [1.1, "先调研磨度，亲测"],
    [3.0, "水温 92 度会不会太高"],
    [4.6, "这个对比实验太费豆子了哈哈"],
    [6.2, "终于有人讲顺序了"],
    [7.8, "求器具清单", "#e0d090"],
  ],
  "seed-05": [
    [0.9, "正弦波真的很好听"],
    [2.5, "泛音叠起来瞬间像样了"],
    [4.0, "包络是灵魂"],
    [5.7, "求推荐免费合成器"],
    [7.4, "这个音色能用到曲子里"],
    [9.1, "想起大学信号课"],
    [10.8, "已保存"],
  ],
  "seed-06": [
    [1.3, "八格拆解刚好"],
    [3.1, "力量方向这段讲透了"],
    [4.8, "自己画总是画不清楚"],
    [6.5, "可以出个续集吗"],
    [8.2, "收藏练起来了"],
  ],
};

const COMMENT_POOL = [
  { content: "这个思路很清晰，先收藏，回头照着做一遍。", replies: ["做完了可以回来交流下差异", "同收藏，先码住"] },
  { content: "求更新下一期，最好把中间省略的部分也讲一下。", replies: ["+1，尤其是第二步"] },
  { content: "看完了，比预期讲得细。感谢。", replies: [] },
  { content: "有个疑问：如果条件不一样，这套方法还成立吗？", replies: ["条件变了结论会变，我下期会补一个反例"] },
];

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("数据库已有数据，跳过种子写入。需要重置请执行：npx prisma db push --force-reset && npm run db:seed");
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users: Record<string, string> = {};
  for (const u of USERS) {
    const created = await prisma.user.create({
      data: { ...u, passwordHash, role: u.username === "demo" ? "admin" : "creator" },
    });
    users[u.username] = created.id;
  }

  const categories: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({ data: c });
    categories[c.name] = created.id;
  }

  const now = Date.now();
  let index = 0;

  for (const v of VIDEOS) {
    const authorId = users[v.author];
    const base = `/media/${v.slug}`;
    const publishedAt = new Date(now - index * 8 * 3600 * 1000);

    const video = await prisma.video.create({
      data: {
        authorId,
        title: v.title,
        description: v.description,
        coverUrl: `${base}/cover.jpg`,
        durationSec: v.durationSec,
        status: "published",
        visibility: "public",
        categoryId: categories[v.category] ?? null,
        viewCount: v.views,
        publishedAt,
        createdAt: publishedAt,
        sources: {
          create: [
            { label: "720p", width: 1280, height: 720, bitrate: 900, url: `${base}/clip-720.mp4` },
            { label: "480p", width: 854, height: 480, bitrate: 450, url: `${base}/clip-480.mp4` },
          ],
        },
        tags: {
          create: v.tags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name, slug: name.toLowerCase().replace(/\s+/g, "-") },
              },
            },
          })),
        },
      },
    });

    const lines = DANMAKU[v.slug] ?? [];
    for (const [timeSec, content, color] of lines) {
      await prisma.danmaku.create({
        data: {
          videoId: video.id,
          userId: users[Math.random() > 0.5 ? "lin" : "mo"],
          content,
          timeSec,
          color: color ?? "#ffffff",
        },
      });
    }

    // 每条视频 2 条主评论，其中一条带回复
    for (let i = 0; i < 2; i += 1) {
      const c = COMMENT_POOL[(index + i) % COMMENT_POOL.length];
      const root = await prisma.comment.create({
        data: {
          videoId: video.id,
          userId: users[USERS[(index + i + 1) % USERS.length].username],
          content: c.content,
          createdAt: new Date(publishedAt.getTime() + (i + 1) * 1800 * 1000),
        },
      });
      for (const reply of c.replies) {
        await prisma.comment.create({
          data: {
            videoId: video.id,
            userId: authorId,
            parentId: root.id,
            content: reply,
            createdAt: new Date(root.createdAt.getTime() + 600 * 1000),
          },
        });
      }
    }

    const commentCount = await prisma.comment.count({ where: { videoId: video.id } });
    await prisma.video.update({
      where: { id: video.id },
      data: {
        danmakuCount: lines.length,
        commentCount,
        likeCount: Math.round(v.views * 0.06),
        coinCount: Math.round(v.views * 0.01),
        favoriteCount: Math.round(v.views * 0.03),
      },
    });

    index += 1;
  }

  // 互相关注，方便看「关注」相关的界面预留
  await prisma.follow.createMany({
    data: [
      { followerId: users.demo, followingId: users.lin },
      { followerId: users.demo, followingId: users.mo },
      { followerId: users.kai, followingId: users.demo },
    ],
  });

  console.log(`种子数据完成：${USERS.length} 个用户 / ${VIDEOS.length} 个视频`);
  console.log(`演示账号：demo@vidora.local  密码：${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
