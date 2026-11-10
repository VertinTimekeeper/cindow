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
