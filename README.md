<!--
  DSH 插件生态公约声明（plugin-ecosystem-convention · 组合优先/声明清晰/兼容优先）
  purpose: CloakBrowser（补丁版 Chromium）生命周期工具：把 20 个加固参数固化为 start/stop/status 三个工具
  inject: 'tools'
  tools: cloak_status,cloak_start,cloak_stop
  runtime: host-only
  envDeps: CloakBrowser 安装目录（补丁版 Chromium）
  boundary: **只认我自己的安装目录，不碰主人的实例**——stop 只杀该目录下的进程；代理 fail-closed（不可用即失败，绝不回落直连）
  compat: cordis ^4.0.1 / schemastery ^3.18.1-rc.1 / dsh-tools >=0.1.0-rc.6
-->
# dsh-cloak-browser

<p align="center">
  <a href="https://github.com/jonah791/dsh-cloak-browser"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="version"></a>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/TypeScript-3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/tests-10%20passed-brightgreen" alt="tests">
</p>

**一句话**：把 **CloakBrowser**（可装扩展的补丁版 Chromium）的启动参数与生命周期，固化成 `start` / `stop` / `status` 三个工具。

**为什么值得用**：CloakBrowser 的可用性依赖**一串加固参数的正确组合**（代理、指纹种子、语言/时区对齐、扩展装载）——手工每次敲一遍，漏一个就表现为「能开但行为不对」这种**最难查的失败**。本插件把 20 个参数固化进 `cloak_start`，并配两个安全默认：**代理 fail-closed**（代理不可用即失败，**绝不回落直连**）与**语言/时区与出口对齐**（不一致本身就是可识别指纹）。

## 能力

**工具面 3 个**（名称逐字来自 `src/index.ts` 的 `defineTool({ name })`）：

| 工具 | 用途 |
|------|------|
| `cloak_status` | 查 CloakBrowser 状态（**只认我自己的安装目录**，不碰主人的实例） |
| `cloak_start` | 启动 CloakBrowser：**fail-closed 代理** + 指纹种子 + 与出口对齐的语言/时区 + 扩展装载（默认 OKX 钱包） |
| `cloak_stop` | 停止 CloakBrowser（**只杀我自己的安装目录下的进程**） |

## 快速开始

**1) 装依赖**：

```jsonc
"dsh-cloak-browser": "link:E:/alice/self-plugins/dsh-cloak-browser"
```

**2) 挂组合**：

```yaml
- id: cloak-browser
  name: dsh-cloak-browser
```

**3) 30 秒验证**：`cloak_status` → 应报「未运行 / 运行中 + 进程与端口」；`cloak_start {seed: 48213}` → 应起进程且**代理不可用时直接失败**（不是静默直连）；再 `cloak_stop` → 只应杀该安装目录下的进程。

## 配置

| 项 | 默认 | 说明 |
|---|---|---|
| `extension` | OKX 钱包扩展目录 | 启动时装载的扩展 |
| `seed` | `48213` | 指纹种子——**同种子 = 同身份** |
| `lang` / `timezone` | 与出口对齐 | 与代理出口地区一致（不一致即可识别） |

## 落盘与自证

| 落点 | 何时写 | 内容 |
|---|---|---|
| `verdict.ts` 的判活结果 | 每次 `cloak_status` | 进程 / 端口 / 目录归属的判定（**只读**，不改任何东西） |

**判据**：`cloak_status` 一条命令答「跑没跑 / 是谁的进程 / 代理通不通」。

## 生效判据与回退

**怎么证明线上跑的是当前构建**：行为级（工具面有 `cloak_*`）+ 构建级（`lib/index.js` mtime 晚于 web 进程启动时间；⚠ 重新构建 ≠ 生效）。
**回退**：① `git revert` + 重建 + 预检重启；② patch 行 `disabled: true`；③ 已起的浏览器进程用 `cloak_stop` 收掉。

## 测试

```bash
cd self-plugins/dsh-cloak-browser && npm test
```

**10 条用例**（跑一次得到）：覆盖状态判定的三态（未运行 / 运行中 / 归属不明）· **目录归属过滤**（不是我的进程不认）· 代理 fail-closed 判定。无需网络（代理探测走注入的假探测）。

## 设计要点

- **只认自己的安装目录**：`cloak_stop` 不碰主人的实例——这是**单点所有权**纪律在进程管理上的落地（同一资源只能有一个 owner）。
- **代理 fail-closed**：代理不可用即失败，**绝不回落直连**——出口与住所脱钩是硬要求，静默降级等于把家宽 IP 暴露在对外活动里。
- **参数固化而非每次敲**：20 个参数里任何一个漏掉都是「能开但行为不对」型失败——最难查的一类。
- **语言/时区与出口对齐**：三者不一致本身就是可识别指纹。

## 相关文档

- [`docs/semantic.md`](docs/semantic.md) —— **权威契约**（定位/反定位 · 验收表）
- 中心仓：[alice-digital-life](https://github.com/jonah791/alice-digital-life)（本插件归 **感知层**）
- 相关技能：`agent-orchestration` · `wsl-headless-web-automation`（代理与出口纪律）

## License

MIT © jonah791

---

本插件属于**爱丽丝 DSH 自研插件生态**（[alice-digital-life](https://github.com/jonah791/alice-digital-life) · 73 个插件 · 8 个模块）：单一职责、独立仓库、独立可用。
