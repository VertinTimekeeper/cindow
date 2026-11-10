# main 分支保护

`main` 是唯一长期分支，所有改动通过 PR 进入。本文列出建议开启的开关，以及对应的 `gh api` 命令。

> **本文档只给命令，不代为执行。** 执行会改动仓库设置，属于账号/仓库管理动作，需要你自己确认后手动运行。
> `gh` 需要具备 `repo`（classic）或 `Administration: Read and write`（fine-grained）权限。

---

## 1. 建议开启的开关

| 开关 | 建议值 | 为什么 |
|---|---|---|
| Require a pull request before merging | 开 | 禁止直接 push 到 `main`，历史可审计 |
| Required approvals | `1` | 至少一人复核；单人项目可临时设 0，但需接受风险 |
| Dismiss stale approvals | 开 | 推送新提交后旧批准作废，避免「批完又改」 |
| Require review from Code Owners | 开 | 配合 `.github/CODEOWNERS` 强制关键路径负责人复核 |
| Require status checks to pass | 开，勾 `typecheck-build` | CI 不过不能合并 |
| Require branches to be up to date | 开 | 合并前先 rebase/合并最新 `main`，避免「绿了但没测最新代码」 |
| Require conversation resolution | 开 | 所有 review 评论必须解决 |
| Require linear history | 可选（建议开） | 保持历史线性；开启后只能 squash / rebase 合并 |
| Block force pushes | 开 | 防止历史被改写 |
| Restrict deletions | 开 | 防止误删 `main` |
| Do not allow bypassing（Include administrators） | 建议开 | 规则对自己同样生效，减少「临时绕过」的坏习惯 |
| Require signed commits | 可选 | 有 GPG/SSH 签名习惯再开 |

**关于 `Require linear history`**：本仓库当前历史里已有一个 merge 提交（合并远端初始 README/LICENSE）。开启线性历史后，后续 PR 请使用 **Squash** 或 **Rebase** 合并方式，不要再产生 merge 提交。

---

## 2. 用网页开启

`https://github.com/VertinTimekeeper/cindow/settings/branches` → **Add branch protection rule** → Branch name pattern 填 `main` → 按上表勾选 → Create。

---

## 3. 用 `gh api` 开启（复制后自行执行）

下面的命令一次性写入完整保护配置（`PUT` 会覆盖该分支原有设置）：

```bash
gh api -X PUT repos/VertinTimekeeper/cindow/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["typecheck-build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

> `contexts` 里的 `typecheck-build` 必须与 `.github/workflows/ci.yml` 中的 job 名称一致，否则状态检查永远「pending」，PR 无法合并。改 job 名时记得同步改这里。
> `restrictions: null` 表示不限制可推送的用户/团队（对个人账号仓库足够）。

**只想改单项时**（例如把批准数改成 2）用 `PATCH` 对应的子端点：

```bash
gh api -X PATCH repos/VertinTimekeeper/cindow/branches/main/protection/required_pull_request_reviews \
  --input - <<'JSON'
{ "dismiss_stale_reviews": true, "require_code_owner_reviews": true, "required_approving_review_count": 2 }
JSON
```

---

## 4. 验证与回滚

```bash
# 查看当前保护配置
gh api repos/VertinTimekeeper/cindow/branches/main/protection

# 只看关键项
gh api repos/VertinTimekeeper/cindow/branches/main/protection \
  --jq '{pr: .required_pull_request_reviews.required_approving_review_count,
         strict: .required_status_checks.strict,
         force: .allow_force_pushes.enabled,
         del: .allow_deletions.enabled}'
```

回滚（删除整条保护规则）：

```bash
gh api -X DELETE repos/VertinTimekeeper/cindow/branches/main/protection
```

> 回滚前想清楚：一旦删除，任何人都能直接 push / force push 到 `main`，历史无法再保证。

---

## 5. 与 deploy key 的关系

- 分支保护对 **deploy key** 同样生效：只有只读权限的 key 不能推；有写权限的 key 绕过不了「必须走 PR」的规则。
- 因此「唯一可推送的机器」指的是**能推送分支**，而不是**能直推 `main`**。日常仍应推特性分支 + PR。
- 如需在紧急情况下直推 `main`，不要长期关闭保护，临时用有权限的账号操作后立刻恢复，并在 PR/issue 里记录原因。

---

## 6. CI 不可用时的过渡方案

### 6.1 为什么撤掉了「必需检查」

本仓库是 `public`，公共仓库的 Actions 分钟数免费，但账号层面仍缺付款方式，任务在启动前就被平台拒绝，日志里没有任何 step：

> `The job was not started because recent account payments have failed or your spending limit needs to be increased.`

也就是说 `typecheck-build` 这个 check 永远不可能变绿。若它仍是必需检查，**每个 PR 都会被永久卡住**。因此当前配置为：

| 开关 | 当前值 | 说明 |
|---|---|---|
| Require a pull request before merging | ✅ 开 | 仍禁止直推 `main` |
| Required approvals | 1 | 单人项目需管理员绕过才能合并 |
| Dismiss stale approvals | ✅ 开 | |
| Require conversation resolution | ✅ 开 | |
| Require linear history | ✅ 开 | 合并请用 Squash / Rebase |
| Block force pushes | ✅ 开 | |
| Restrict deletions | ✅ 开 | |
| **Require status checks** | ❌ **已撤** | 待计费恢复后加回 |
| Include administrators | ❌ 关 | 否则唯一成员无法批准自己的 PR，会造成死锁 |

`.github/workflows/ci.yml` **保留未删**，计费恢复后无需改动即可生效。

### 6.2 本地检查覆盖了什么

`main` 的合并门槛从「远程 CI」暂时换成「本机手动/钩子检查」，对应关系：

| 原 CI 步骤 | 本地替代 | 差异 |
|---|---|---|
| `npm ci` | `scripts/check.sh` 第 1 步（已装且 lockfile 未变则跳过） | 无 |
| `prisma generate` | 第 2 步 | 无 |
| `tsc --noEmit` | 第 3 步 | 无 |
| `npm run build` | 第 4 步 | 无 |
| Prisma schema 变更提醒 | **无** | 需人工留意 `prisma/schema.prisma` 是否改了却没加迁移 |
| 独立 runner / 干净环境 | **无** | 本机可能残留 `node_modules`、`.next`，漏掉「全新安装才能复现」的问题 |
| Node 版本固定 | **无** | CI 用 `22`；本机版本可能不同，建议 `node -v` 自查 |

用法：

```bash
bash scripts/check.sh                  # 完整四步
bash scripts/check.sh --skip-build     # 只跑到类型检查，快速反馈

bash scripts/install-hooks.sh          # 安装 pre-push 钩子（自动调用上面的脚本）
bash scripts/install-hooks.sh --status # 查看是否已安装
bash scripts/install-hooks.sh --uninstall

git push --no-verify                   # 紧急跳过钩子
CHECK_ARGS=--skip-build git push       # 跳过重量级构建，只做类型检查
```

钩子只写入 `.git/hooks/pre-push`，不进版本库，每台机器需各自安装一次。

### 6.3 将来如何恢复远程 CI

前置条件：账号已绑定可用的付款方式，且 `gh run list` 能看到最近一次运行**真的执行了 step**（不是 3 秒内 0 step 结束）。

1. 确认工作流能跑通：打开 Actions 页面手动触发或推一个分支验证，确认 `typecheck-build` 出现且为绿色。
2. 重新加回必需检查（`main` 已保护，此命令只改检查项，不影响其他开关）：

```bash
gh api -X POST repos/VertinTimekeeper/cindow/branches/main/protection/required_status_checks \
  -f strict=true \
  -f 'contexts[]=typecheck-build'
```

3. 校验：

```bash
gh api repos/VertinTimekeeper/cindow/branches/main/protection/required_status_checks \
  --jq '{contexts,strict}'
```

4. 若某天工作流改名或 job 改名，记得同步这里的 `contexts[]`，否则 PR 会因「等待一个不存在的 check」而一直 pending。

> 顺序很重要：**先让 check 真正变绿，再设为必需**。反过来做会让所有 PR 立刻不可合并。
