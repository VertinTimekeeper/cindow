import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { fail, ok, readJson, str } from "@/lib/http";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "请求体需要是 JSON");

  const email = str(body.email, 120).toLowerCase();
  const username = str(body.username, 20);
  const password = str(body.password, 72);
  const displayName = str(body.displayName, 40) || username;

  if (!EMAIL_RE.test(email)) return fail(400, "邮箱格式不正确");
  if (!USERNAME_RE.test(username)) return fail(400, "用户名需为 3-20 位字母、数字、下划线或短横线");
  if (password.length < 8) return fail(400, "密码至少 8 位");

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (exists) {
    return fail(409, exists.email === email ? "该邮箱已注册" : "该用户名已被占用");
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash: await hashPassword(password),
      role: "creator",
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
  });

  await createSession(user.id);
  return ok({ user }, { status: 201 });
}
