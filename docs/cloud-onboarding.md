# 云端接入与分层凭据

本文面向「懂技术但不是专业运维」的读者，说明如何把 **cindow** 接到新机器上（云电脑、境外服务器、另一台 Mac），并在不牺牲安全的前提下完成日常提交。

仓库：`https://github.com/VertinTimekeeper/cindow`
默认分支：`main`（受保护，见 [branch-protection.md](branch-protection.md)）

---

## 0. 三条原则

1. **一台机器一把钥匙**。任何凭据都不在多台机器之间复制粘贴。
2. **凭据只存在于机器上，不存在于仓库里**。仓库里永远只有模板（`.env.example`）和文档。
3. **能只读就别给写**。只拉代码的机器拿只读凭据，推送能力只保留在唯一一台「发布机」上。

---

## 1. 凭据分级

| 档位 | 用在哪 | 能力 | 存放位置 |
|---|---|---|---|
| A. **write deploy key** | 唯一可推送的机器（如主力 Mac、云端发布机） | 仅本仓库的读写 | `~/.ssh/cindow_write`（私钥），公钥登记在仓库 Deploy keys |
| B. **只读 deploy key** | 只拉代码的机器（只跑构建、只读浏览、演示机） | 仅本仓库的只读 | `~/.ssh/cindow_read` |
| C. **fine-grained PAT** | 临时需要 API / CI 交互，且不方便用 SSH 时 | 仅 cindow、仅指定权限 | 系统密钥管理（Keychain / Credential Manager / secret-tool） |

> Deploy key 绑定「仓库」而不是「账号」，所以即使泄露也只影响这一个仓库，且可单独吊销——这正是它比账号级 token 更安全的原因。

### A / B. Deploy key 的生成与落地

**第 1 步：在本机生成密钥对**（A 用 write，B 用 read，`-C` 注释写清机器名便于日后辨认）

```bash
ssh-keygen -t ed25519 -C "cindow-cloud-1-write" -f ~/.ssh/cindow_write -N ""
ssh-keygen -t ed25519 -C "cindow-cloud-2-read"  -f ~/.ssh/cindow_read  -N ""
```

`-N ""` 表示不设口令（适合无人值守）。**如果这台机器由多人共用，请设置口令并配合 `ssh-agent`。**

**第 2 步：收紧权限**（否则 SSH 会直接拒绝使用该私钥）

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/cindow_write ~/.ssh/cindow_read
chmod 644 ~/.ssh/cindow_write.pub ~/.ssh/cindow_read.pub
```

**第 3 步：把公钥登记到 GitHub 仓库**

1. 打开 `https://github.com/VertinTimekeeper/cindow/settings/keys`
2. 点 **Add deploy key**
3. Title 填机器名（如 `cloud-1-write`）
4. Key 粘贴 `cat ~/.ssh/cindow_write.pub` 的**整行内容**
5. 需要推送的机器勾选 **Allow write access**；只拉代码的**不要勾**
6. Add key

> 同一把公钥只能登记为一个 deploy key。两台机器必须生成两把不同的钥匙。

**第 4 步：写 `~/.ssh/config` 别名**（让 git 用指定的钥匙，而不是默认钥匙）

```sshconfig
Host github-cindow-write
  HostName github.com
  User git
  IdentityFile ~/.ssh/cindow_write
  IdentitiesOnly yes

Host github-cindow-read
  HostName github.com
  User git
  IdentityFile ~/.ssh/cindow_read
  IdentitiesOnly yes
```

**第 5 步：远程地址用别名，不要用 `git@github.com`**

```bash
# 可推送的机器
git remote set-url origin git@github-cindow-write:VertinTimekeeper/cindow.git

# 只读的机器
git remote set-url origin git@github-cindow-read:VertinTimekeeper/cindow.git
```

**第 6 步：验证**

```bash
ssh -T git@github-cindow-write
# 期望：Hi VertinTimekeeper/cindow! You've successfully authenticated,
#        but GitHub does not provide shell access.
```

出现 `Hi <owner>/<repo>!` 说明用的是 deploy key（正确）；如果显示 `Hi <用户名>!`，说明实际走的是账号级 SSH key，不是 deploy key。

**第 7 步：不想改 `~/.ssh/config` 时的临时方案**

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/cindow_write -o IdentitiesOnly=yes' \
  git push origin main
```

适合一次性操作；不建议长期依赖，因为容易忘记设置而误用其他钥匙。

### C. Fine-grained PAT

仅在「必须走 HTTPS/API」且不方便用 SSH 时使用。

**生成**

1. `https://github.com/settings/personal-access-tokens/new`
2. Token name：`cindow-<机器名>-<用途>`，有效期 ≤ 90 天
3. **Repository access** 选 *Only select repositories* → 只勾 `cindow`
4. **Permissions** 只给必要项：
   - `Contents: Read`（需要推送才选 `Read and write`）
   - `Metadata: Read`（必选，自动包含）
   - 其他一律 `No access`
5. 生成后立刻存入系统密钥管理，**不要**留在剪贴板或文件里

**落地**

```bash
# macOS：存进钥匙串，git 通过 gh 的 credential helper 读取
gh auth login --with-token < /dev/stdin   # 粘贴后按 Ctrl-D，不要写进命令行参数

# 或临时使用（仅当前 shell，不落盘）
export GIT_ASKPASS=/usr/bin/true          # 不推荐：容易把 token 暴露在进程参数里
```

更稳妥的做法：把 token 写入系统密钥管理，再用 `git credential` 取值，避免出现在 shell 历史与 `ps` 输出中。

---

## 2. 明确禁止（每条都对应真实事故）

| 禁止 | 原因 |
|---|---|
| 把 token 拼进 remote URL，如 `https://user:ghp_xxx@github.com/...` | 会明文留在 `.git/config`，任何能读目录的人/脚本都能拿到；`git remote -v` 会直接打印 |
| 把 token / 私钥提交到仓库 | 一旦推送就进入历史，删除文件也无法抹去，只能吊销重发 |
| token 写进 shell 历史（直接 `export TOKEN=...`、`curl -H "..."`） | `~/.zsh_history` 明文长期留存 |
| 多台机器共用同一把钥匙 | 无法定位泄露源，吊销时全部机器中断 |
| 给 AI / 第三方工具全账号权限的 classic token | classic token 往往是全仓库 + 全 scope，等于交出账号；要临时授权就用细粒度、限仓库、短有效期 |
| 把 `.env` 提交或贴进聊天 | 本地数据库连接串、密钥都可能在里面；仓库只需要 `.env.example` |
| 在共享机器上留无口令私钥 | 任何登录该机器的人都能以你的身份推送 |

---

## 3. 每台机器的 git 身份

**为什么区分**：让每次提交都能追溯到具体机器，出问题时能快速判断是哪台机器、哪把钥匙；同时避免把个人邮箱写进提交记录；CI 与审计也更容易定位来源。

| 机器 | `user.name` | `user.email` |
|---|---|---|
| 主力 Mac | `cindow-mac` | `<你的GitHub数字ID>+cindow-mac@users.noreply.github.com` |
| 云电脑 1 | `cindow-cloud-1` | `<你的GitHub数字ID>+cindow-cloud-1@users.noreply.github.com` |
| 境外服务器 | `cindow-vps-1` | `<你的GitHub数字ID>+cindow-vps-1@users.noreply.github.com` |

数字 ID 查询：`gh api user --jq .id`。使用 `users.noreply.github.com` 邮箱可以保证提交被 GitHub 归属到你账号，同时不暴露真实邮箱。

设置（只对本仓库生效，不污染全局配置）：

```bash
git config user.name  "cindow-cloud-1"
git config user.email "<ID>+cindow-cloud-1@users.noreply.github.com"
```

---

## 4. 首次接入完整步骤

```bash
# 1) 依赖：Node ≥ 20.9、npm、git；可选 ffmpeg（生成示例视频）
node -v && npm -v && git --version

# 2) 生成并登记凭据（第 1 节 A 或 B），确认 ssh -T 返回 Hi <owner>/<repo>!

# 3) 一条命令完成：clone/更新 + 身份 + 依赖 + 建库
export GIT_USER_NAME="cindow-cloud-1"
export GIT_USER_EMAIL="<ID>+cindow-cloud-1@users.noreply.github.com"
export CINDOW_DIR="$HOME/cindow"
bash scripts/bootstrap.sh

# 4) 本地起服务
npm run dev     # http://localhost:3000
```

`bootstrap.sh` 是幂等的：目录不存在就 clone，已存在就 `pull --ff-only`；依赖和数据库只在需要时才处理。

---

## 5. 提交前必过检查

```bash
git status                      # 只应有你预期的改动
git diff --cached --name-only   # 逐条看文件名，确认没有 .env / 私钥 / 大文件 / dev.db

# 密钥与敏感串扫描（有输出就必须处理）
git diff --cached | grep -nEi 'ghp_|gho_|github_pat_|BEGIN .*PRIVATE KEY|password\s*=|secret\s*=|token\s*=' || echo "clean"

npm run build                   # 必须通过（CI 也会跑）
npx tsc --noEmit                # 类型检查
```

另外确认：

- 没有把 `storage/` 下的媒体文件、`prisma/dev.db`、`.next/` 加进暂存区（它们已在 `.gitignore`）
- 认证相关的改动不要顺带提交
- 改动范围与 PR 描述一致；跨模块改动请拆分

---

## 6. 出问题时的排查顺序

```bash
# 1) SSH 到底用了哪把钥匙、认证成谁
ssh -vT git@github-cindow-write 2>&1 | grep -Ei 'Offering|Authenticated|Hi '

# 2) deploy key 是否有写权限（能拉不能推 = 没勾 Allow write access）
git ls-remote origin            # 成功 = 读权限正常
git push --dry-run origin main  # 失败且提示 read-only → 回仓库 Settings → Deploy keys 勾写权限

# 3) HTTPS / gh 通道状态
gh auth status
git config --get-all credential.https://github.com.helper

# 4) 远程地址是否指向了错误的别名
git remote -v

# 5) 私钥权限是否被 SSH 拒绝
ls -l ~/.ssh/cindow_*

# 6) 临时强制指定钥匙
GIT_SSH_COMMAND='ssh -v -i ~/.ssh/cindow_write -o IdentitiesOnly=yes' git push origin main
```

常见对应关系：

| 现象 | 多半是 |
|---|---|
| `Permission denied (publickey)` | 公钥没登记，或 `IdentityFile` 指错，或权限不是 600 |
| `ERROR: The key you are using is not authorized` | 公钥登记在别的仓库 |
| 能 clone 不能 push | deploy key 没勾 write；或分支保护不允许直接推送（这是预期行为，走 PR） |
| `could not read Username` | 走的是 HTTPS 但没配 credential helper，改用 SSH 别名或 `gh auth setup-git` |
| `Updates were rejected` | 远端有新提交，先 `git pull --rebase`（不要 force push） |

---

## 7. 泄露与下线：吊销流程

**钥匙疑似泄露（立刻做，按顺序）**

1. 仓库 → Settings → Deploy keys → 删除对应 key（秒级失效）
2. 如果是 PAT：`https://github.com/settings/personal-access-tokens` → Revoke
3. 本机清理残留：`rm ~/.ssh/cindow_write ~/.ssh/cindow_write.pub`，从 `~/.ssh/config` 删掉对应 Host 段
4. 检查是否已被滥用：仓库 → Insights → Traffic；`git log --author=cindow-cloud-1` 看有无陌生提交
5. 换机器重新生成**新的**密钥对并登记，不要复用旧的注释名
6. 在 `docs/` 或团队记录里登记这次事件（时间、影响范围、已吊销项）

**机器下线 / 转让**

1. 删除该机器的 deploy key 与 PAT（同上）
2. 若该机器曾是可推送机器，确认没有未推送的本地提交（`git log origin/main..HEAD`）
3. 从 `~/.ssh/config` 与凭据管理中清空相关条目
4. 不要保留「先留着以后可能用」的旧 key——它只会成为隐患

---

## 8. 相关文档

- [branch-protection.md](branch-protection.md)：`main` 保护开关与 `gh api` 命令（需手动执行）
- [architecture-handbook.md](architecture-handbook.md)：架构原理与协作约定
- `.github/CODEOWNERS`：关键路径负责人
- `.github/pull_request_template.md`：PR 四要素
