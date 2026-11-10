import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { fail, ok, readJson, str } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "请求体需要是 JSON");

  const account = str(body.account, 120).toLowerCase();
  const password = str(body.password, 72);
  if (!account || !password) return fail(400, "请填写账号和密码");

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: account }, { username: account }] },
  });

  // 不区分「用户不存在」和「密码错误」，避免账号枚举
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail(401, "账号或密码不正确");
  }

  await createSession(user.id);
  return ok({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
}
