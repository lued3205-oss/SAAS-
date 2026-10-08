# Atlas 海外公司服务平台

第一阶段的全栈实现：React 客户端与管理端、Express API、SQLite 持久化数据库。页面从数据库读取真实数据，不包含虚构订单。需要 Node.js 24（使用内置 `node:sqlite`）。

## 本地运行

```bash
cd /workspace/SAAS-
npm ci
npm run build
bash scripts/create-admin.sh
npm start
```

创建管理员脚本通过终端输入邮箱和密码，不提供默认管理员密码。重复执行不会覆盖已有账户。客户通过页面自行注册。服务端默认端口 3000。开发时在一个终端运行 `npm run dev`，另一个终端运行 `npx vite --host 0.0.0.0`；Vite 将 `/api` 转发至 3000。

配置可参考 `.env.example`。应用不会自动读取 `.env`，可以通过 Node 的 `--env-file=.env` 启动，或由部署平台注入环境变量。请勿提交 `.env`、数据库或商户密钥。启动管理员配置也可通过 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 注入；只在账户不存在时创建账户，密码至少 12 位。

## 已实现的业务

- 客户注册、登录、退出；管理员与客户权限分离。
- 英国 Ltd / 美国 LLC 申请，保存公司名、负责人、联系地址、业务说明。
- 客户公司总览、搜索、状态筛选和完整办理时间线。
- 管理员查看所有客户申请、审核资料、记录补充资料要求、更新官方递交及完成状态。
- 支付宝、微信支付、对公转账、Airwallex 人工付款凭证记录。管理员确认或驳回付款，客户端不能自行标记到账。
- SQLite 保存账户、会话、公司、办理事件与付款记录。删除服务进程不删除数据。
- 可选 Stripe Checkout 和签名验证回调适配器，不是已连接的商户渠道。

当前 UK US 服务费为初始示例报价 **USD 299 / USD 499**，金额从服务端生成。上线前需确认正式报价、币种、税费、退款政策和收款账户。人工付款仅记录凭证说明，不上传文件，且应先线下获取运营方提供的真实收款信息。客户资料字段为第一阶段基础资料，不构成英国或美国完整的法定注册 / KYC 资料。

## 支付渠道接入边界

用户指定的支付宝 / 微信支付 / 对公转账 / Airwallex 当前实现的是人工核款流程，没有调用真实商户 API，没有模拟支付成功。自动在线收款需在后续任务提供服务商商户配置，通过部署平台安全注入凭据：

- 支付宝：应用和商户配置、私钥、公钥 / 证书、签名校验及通知域名。
- 微信支付：商户号、应用 ID、API v3 密钥、商户证书与平台证书 / 公钥、通知地址。
- Airwallex：账户及应用 API 配置、开通的支付方式、Webhook 配置与地区币种。
- 对公转账：明确收款账户、交易对账与退款审批。

不得在浏览器或仓库保存私钥。真实渠道应以验签回调、金额和币种校验、订单一致性和幂等性确认到账，不能根据前端跳转判定支付成功。

可选 Stripe 适配器需 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`APP_URL`；Webhook 路径 `/api/payments/webhook`，监听 `checkout.session.completed`、`checkout.session.async_payment_succeeded`。未配置时前端不显示在线付款按钮。这个适配器未进行真实商户联调，不属于已通过的支付渠道。

## 验证

```bash
npm test
npm run build
```

集成测试使用独立临时数据库和真实 HTTP 服务，覆盖客户注册、申请提交、客户数据隔离、管理端授权、付款凭证防重复、付款审核、进度时间线、数据库重新打开后记录及会话保留、跨站来源拒绝和退出登录。测试数据不会进入业务数据库。

## 生产部署要求

本仓库提供第一阶段可运行基础版本，**尚未完成正式生产上线验收**。SQLite 适合当前单实例部署；必须将 `DB_PATH` 放在持久化磁盘，而不是临时容器层。多实例 / 高并发部署需迁移 PostgreSQL，并将内存登录限流移到共享存储。

正式上线前至少完成：HTTPS 反向代理、`COOKIE_SECURE=true`、管理员账户安全初始化、数据库备份与恢复演练、敏感资料存储权限和保留策略、付款商户真实联调、账户恢复与邮件验证、日志监控、隐私与服务条款、报价及退款政策审核。本版本没有找回密码、邮箱验证、文件上传、消息发送、MFA、自动退款和完整 KYC/受益人资料收集。

SQLite 在线备份可使用 Python 的备份 API（将目标目录设置为受限权限，不提交备份）：

```bash
mkdir -p /workspace/backups
chmod 700 /workspace/backups
python - <<'PY'
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
p = Path('/workspace/backups') / ('atlas-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.sqlite')
with sqlite3.connect('data/atlas.sqlite') as source, sqlite3.connect(p) as dest:
    source.backup(dest)
p.chmod(0o600)
PY
```

运行环境隔离，不需要新建 Git worktree。重启时复用现有数据库，禁止自动清空用户数据。管理员初始化脚本只能由运营方执行。

## 后续阶段

第二阶段：年审、VAT、地址续费、申报台账、可配置到期规则、定时任务、邮件 / 站内提醒及发送幂等；已预留 `obligations` 数据表，尚未提供相应业务接口或界面。

第三阶段：英国 Companies House 查询及依法授权的提交能力、美国选定州的官方 / 授权渠道、海外会计师接口、外部请求审计及重试。美国没有统一的全国州务卿注册 API，需要先选择州及实际可用的服务商。VAT 接入还需要明确相应 HMRC 授权和服务范围。当前这些外部接口均未连接。

## 公网体验部署

已提供 `Dockerfile`、`compose.yaml` 与 Render Blueprint `render.yaml`。这三个文件是部署配置，不代表已经部署或已经获得网址。

### Render

将源码保存到你的 GitHub 仓库后，在 Render 账号中创建 Blueprint 并选择该仓库。在平台安全设置中填写 `ADMIN_EMAIL` / `ADMIN_PASSWORD`（至少12位），不要使用演示密码。`render.yaml` 选择带持久化磁盘的 Starter 方案，**会产生托管费用，创建前须确认平台当前价格与预算**。免费无磁盘实例不适合作为持久化正式系统。

部署成功后，Render 会分配实际 HTTPS 域名。用该域名的 `/api/health` 检查服务，再打开 `/login` 测试客户注册、申请提交和管理端操作。实际网址只能在部署成功后确认。测试时请使用测试资料，真实商户渠道尚未连接。

### 现有服务器

在 Docker 与 Compose 可用的服务器上，将管理员变量通过服务器的安全配置注入，然后运行 `docker compose up -d --build`。本配置只把 3000 端口绑定在本机，需由 HTTPS 反向代理转发你的实际域名。`COOKIE_SECURE=true` 要求浏览器通过 HTTPS 访问。Compose 命名卷 `atlas-data` 保存数据库；不要运行 `docker compose down -v`，它会删除持久化卷。数据库备份和恢复应在放量前验证。

当前云对话没有托管部署连接，也没有内置网页公网预览。放行 HTTPS 域名不足以证明 Cloudflare Tunnel 能工作，它还需要隧道连接能力；当前检测中该连接未成功。不要把环境发布操作等同于网站公开部署，也不要将截图网址或本机地址描述为可交互的公网体验站。

部署配置校验结果：Compose 配置语法通过，应用集成测试与前端构建通过；Docker 镜像依赖安装在当前云环境未完成，不能称为容器部署已验证。目标托管环境仍需构建并通过启动与持久化检查。
