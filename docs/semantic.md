# dsh-cloak-browser · 语义文档

> 元信息：版本 v0.1 · 状态 draft（**已挂载**，见 §1）· 最近复核 2026-09-22 · owner agent-cloak-browser

## 1 · 定位与反定位

**是什么**：CloakBrowser（我自己的**补丁版 Chromium**）的**生命周期工具**——把一长串加固启动参数固化成 `start` / `stop` / `status` 三个工具调用。它启动的浏览器自带：**fail-closed 代理**（代理不通就不起来）、**指纹种子**（同种子 = 同身份，可复现）、**与出口对齐的语言/时区**（避免「出口在东京、浏览器说中文」这种关联点）、可装扩展（默认 OKX 钱包）。

**当前状态**：**已挂载**（`.dsh/profiles/web/cordis.patch.yml:284` 的 `agent-cloak-browser` 行）。

**不是什么**：
- **不是**浏览器驱动/自动化：它只负责**起停**，不点击、不填表、不读页面（那是 computer-use / webops / CDP 的领域）。起完之后怎么用是别的工具的事。
- **不是**扩展管理器：只在启动时把一个**目录**当扩展装上，不安装/更新/卸载扩展。
- **不是**通用浏览器启动器：它只认**我自己的安装目录**，**不碰主人的 Chromium/Chrome 实例**（这是设计红线，也是 §5.25 数字身份隔绝的一部分）。
- **不是**反检测工具的"保证"：指纹种子与出口对齐降低关联性，但不承诺任何站点不会识别自动化（§5.26 G7：不靠伪装穿别人的风控）。

## 2 · 术语表

| 术语 | 含义 |
|------|------|
| CloakBrowser | 我的补丁版 Chromium（可装扩展）；与主人的日常浏览器是**两个东西、两个目录** |
| 我的安装目录 | CloakBrowser 自己的安装路径——`stop` 只在该目录范围内找进程杀 |
| 指纹种子（seed） | 决定浏览器指纹形状的整数（默认 `48213`）；**同种子 = 同身份** ⇒ 换种子等于换身份，别乱换 |
| fail-closed 代理 | 代理不可用则**启动失败**，绝不回落直连（§5.26 G6 出口与住所脱钩） |
| 出口对齐 | `lang`（默认 `ja`）与 `timezone`（默认 `Asia/Tokyo`）应与代理出口地区一致——否则时区/语言成为身份关联点 |
| OKX 扩展 | 默认装载的扩展目录（钱包类）——**扩展只装我自己的**，不装主人的 |
| `cloak-browser.ps1` | 唯一执行通道：`projects/self/alice-identity/scripts/cloak-browser.ps1`，子命令 `start` / `stop` / `status` |

## 3 · 概念模型与不变量

```
爱丽丝（模型）
 └─ cloak_start / cloak_stop / cloak_status
      └─ execFile(powershell.exe -NoProfile -ExecutionPolicy Bypass -File cloak-browser.ps1 <sub> …)
           └─ CloakBrowser（补丁版 Chromium，我自己的安装目录）
                ├─ 代理（fail-closed）→ 出口
                ├─ 指纹种子
                └─ 扩展目录（默认 OKX）
```

不变量（必须永远为真）：
1. **只碰自己的**：`stop` 只杀**我的安装目录**下的进程；**主人的浏览器实例永不作为目标**（这条是设计红线，也是本插件最该被尸体测试的一条——见 §7 A2）。
2. **代理 fail-closed**：代理不可用 ⇒ 启动失败，**不裸连**（G6）。
3. **同种子 = 同身份**：种子是身份的稳定锚；换种子 = 换身份，不是"随机化一下"。
4. **不驱动页面**：起停之外不做任何页面交互 ⇒ 本插件的能力面窄而明确。
5. ⚠ **`enabled` 当前不成立**：Config 声明了但 `apply()` 不检查 ⇒ 置 `false` 不会禁用（见 §10 U1；**同型缺陷在三个 forge 骨架里各出现一次**）。

## 4 · 契约

### 4.1 配置（Config schema）

| 名 | 类型 | 默认 | 语义 |
|----|------|------|------|
| `enabled` | boolean | `true` | 声明上的开关。⚠ **实现未消费**（`apply()` 不检查）⇒ 关不掉，见 §10 U1 |

> 注：本插件的**真正参数**不在 Config 里，而在 `cloak_start` 的工具参数上（见 §4.2）；固定加固项固化在 `cloak-browser.ps1` 内。

### 4.2 工具面

| 工具 | 参数 | 通道 | 超时 | 说明 |
|------|------|------|------|------|
| `cloak_status` | （无） | `cloak-browser.ps1 status` | 60 000 ms | 查状态；**只认我的安装目录**，不碰主人实例 |
| `cloak_start` | `seed`(number, 默认脚本值 48213) · `extension`(string, 默认 OKX 钱包目录) · `lang`(string, 默认 `ja`) · `timezone`(string, 默认 `Asia/Tokyo`) | `cloak-browser.ps1 start [-Seed N] [-Extension X] [-Lang L] [-Timezone TZ]` | **120 000 ms** | 启动；参数按存在与否**逐项透传**（`if (seed) a.push('-Seed', …)`）；扩展路径 `undefined` 时不传（脚本走默认） |
| `cloak_stop` | （无） | `cloak-browser.ps1 stop` | 60 000 ms | 停止；**只杀我自己的安装目录下的进程** |

三者 `output.schema` 均为 `{ok: boolean(required), text?: string}`、`additionalProperties: false`；`render` 把对象 `JSON.stringify` 成单条文本。

### 4.3 调用点清单 `[MUST]`

| 调用点 | 位置 | 说明 |
|--------|------|------|
| 爱丽丝（模型） | `src/index.ts:23` `cloak_status` | 起浏览器前后确认状态 |
| 爱丽丝（模型） | `src/index.ts:43` `cloak_start` | 需要真浏览器（JS 挑战 / 指纹门 / 要装扩展）时 |
| 爱丽丝（模型） | `src/index.ts:74` `cloak_stop` | 用完即关（降低足迹） |
| 本插件 → 外部脚本 | `E:\alice\projects\self\alice-identity\scripts\cloak-browser.ps1`（**硬编码绝对路径**，见 §10 U3） | 唯一执行通道；`-NoProfile -ExecutionPolicy Bypass`、`windowsHide: true` |
| 宿主组合 | `.dsh/profiles/web/cordis.patch.yml:284` | web 启动装载（无 config ⇒ 全默认） |

## 5 · 边界与信任

- **输入信任级别**：`seed`/`extension`/`lang`/`timezone` 由调用方给，**形状不校验**，直接进 `execFile` 参数数组 ⇒ **不存在命令注入面**（选 `execFile` 而非 `exec` 的实际收益，应保持）。但 `extension` 是**路径**：指向什么目录就装什么扩展 ⇒ 该参数等价于"允许装入任意本地扩展代码"，属**高信任参数**（见 §10 U4）。
- **凭据与隐私**：本插件**不接触**凭据（不读 vault、不传 token）；它的隐私价值在**指纹与出口**——种子稳定 + 语言时区与出口对齐，避免产生关联点。扩展（默认 OKX）自身可能持有秘密，那是扩展的事，不由本插件托管。
- **能力边界诚实声明**：**capability ≠ 沙箱**——"只杀自己目录的进程"与"不碰主人实例"都是**脚本的实现自律**，不是权限隔离；`cloak_stop` 在实现上具备杀进程的能力，边界靠脚本内的目录判定。
- **破坏面**：`stop` 是**杀进程**操作（不可逆但可重启）；`start` 会**占用端口/资源**并**出网**（经代理）。⇒ 这两条都不属"须请示三类"，但都应在调用前想清楚。
- **环境依赖**：需 Windows `powershell.exe` + 固定路径脚本 + 已安装的 CloakBrowser；缺失时执行失败（且按 U2 会伪装成 `ok:true`）。

## 6 · 与既有机制的关系

- **与 computer-use / webops（CDP）**：**起停 vs 驱动**。本插件把浏览器**起来**（带上正确的指纹/出口/扩展），驱动交给 computer-use（看-动-看循环）或 webops（CDP attach）。
- **与 `dsh-identity-ops`**：同一身份栈的两种取数方式——**HTTP（零浏览器，~3s）vs 真浏览器（能过 JS/指纹门，但重）**。能用前者就别起后者。
- **与 `dsh-vault-meta`**：同栈；vault-meta 管凭据元数据（未挂载），本插件管浏览器生命周期。
- **与技能 `identity-bootstrap` / `captcha-gate-ops`**：方法是技能，本插件是"把带正确指纹与出口的浏览器端上来"的仪器。
- **与 §5.26 幽灵纪律**：本插件是 G6（出口脱钩）、G1（一身份一隔间，种子即隔间锚）、G2（最小足迹：用完 `stop`）的落地件。
- **与 §5.20 语义文档系统**：本文登记于 `docs/semantics/registry.json`（id=`cloak-browser`）。

## 7 · 可证伪验收清单

| # | 可证伪命题 | 证据（命令/单测名/日志行） | 状态 |
|---|-----------|--------------------------|------|
| A1 | 骨架冒烟通过 | `npm test` → 5/5（`tests/smoke.test.mjs`） | ⏳ 待验收（**骨架守卫，不覆盖 execute**） |
| A2 | **`stop` 不误杀主人的浏览器实例**（本插件最该证的一条） | ① 先确认主人的浏览器进程在跑（如他的 Chrome/TauriTavern）；② 调 `cloak_stop`；③ 断言**主人的进程仍在**、只有我自己安装目录下的进程消失 | ⏳ 待验收（**坏样本易得：主人实例本来就在跑**，这条判据有天然对照组） |
| A3 | **代理不通 ⇒ 启动失败，不裸连**（fail-closed） | 停掉 Clash（或把代理指向关闭端口）⇒ `cloak_start` 必须**失败**；断言没有出现直连外网的浏览器进程 | ⏳ 待验收（G6 硬要求） |
| A4 | 同种子启动得到可复现的指纹 | 同一 `seed` 起两次，读同一指纹探针页（如 canvas/UA 组合）⇒ 两次一致；换 `seed` ⇒ 不一致 | ⏳ 待验收 |
| A5 | 脚本缺失/失败时不得伪装成功 | 把脚本路径改指不存在的位置 ⇒ 当前返回 `ok:true` + 错误文本 ⇒ **本判据会亮**（见 §10 U2） | ⏳ 待验收（预期 FAIL） |

**计数口径（fail-closed）**：`total=5 · proven=0 · pending=5` ⇒ 状态停在 `draft`。

## 8 · 与实现的关系

- 主实现：`src/index.ts`（93 行：3 个 `defineTool`，每个内部 `promisify(execFile)` 调同一 ps1 + 同一段"归一返回值"收尾）
- 同仓相邻件：`src/fabric.ts`（43 行，Fabric 静态骨架，未接线）、`cordis.patch.yml`
- 测试：`tests/smoke.test.mjs`（43 行，forge 骨架守卫）——**无业务测试**；「只杀自己目录」这条红线**当前没有任何自动化判据**（见 §7 A2）
- 返回归一化模式：三段几乎逐字重复的 `if (__raw && typeof __raw === 'object' && 'ok' in __raw) … return {ok:true, text} …` ⇒ 复制粘贴的痕迹明显（§10 U5 提议抽公共件）
- **同语义副本**：无

## 9 · 实践修订记录

- **2026-09-16 首次生成**：由 `dsh-plugin-forge` 生成骨架（10 处 `<TODO>`）。
- **2026-09-22 填实**：10 处 `<TODO>` 补为可核对契约（术语 / 概念模型 / 5 条不变量 / Config / 3 工具面含超时 / 调用点 / 边界 / 5 条验收）。副产物是 5 处缺口记入 §10。
  > **跨插件发现（比单条更重要）**：本文填实后确认，`dsh-cloak-browser` / `dsh-vault-meta` / `dsh-identity-ops` **三个 forge 骨架有完全相同的三处缺陷**——`enabled` 声明了不消费、失败恒返回 `ok:true`、外部脚本路径硬编码绝对路径。⇒ 这是 **`dsh-plugin-forge` 生成器的模板层缺陷**，不是三个插件各自的手误。修一份模板胜于逐个补三份（§5.9 规则 4：异常状态先问「为什么是这样」——三处同型 = 找上游）。

## 10 · 未决问题

- **U1 `enabled` 是死配置**（三个骨架同型 ⇒ 模板问题）：Config 声明、`apply()` 不检查 ⇒ 关不掉。⇒ 建议在 `dsh-plugin-forge` 模板层统一修（或干脆不生成这个字段），避免继续复制。
- **U2 失败语义失真**：任意输出都返回 `{ok:true, text}`，脚本报错也被标成功 ⇒ 调用方无法区分「浏览器起来了」与「脚本炸了」。⇒ 建议按非零退出/stderr 判定 `ok:false`，并加 A5 尸体测试。
- **U3 硬编码绝对路径**：`E:\alice\projects\self\alice-identity\scripts\cloak-browser.ps1` 写死三处 ⇒ 不可移植、换机即断。⇒ 建议改配置项（带默认）或相对解析。
- **U4 `extension` 是高信任参数**：它等价于「允许把任意本地目录作为扩展代码装入浏览器」。⇒ 建议：① 在描述与文档里显式声明该参数的信任级别；② 若可枚举白名单目录，加白名单校验（否则至少拒绝明显越界的路径形态）。
- **U5 三段返回归一化代码近乎重复**：后续若加第四个工具，复制粘贴会继续扩散。⇒ 建议抽一个 `runCloak(sub, extraArgs, timeout)` 公共件（§5.30 规则 3：命名即文档）。
- **U6 无持久轨迹（§5.22）**：只有 `ctx.logger` ⇒ 事后无法回答「这只浏览器什么时候起过、用哪个种子」。⇒ 建议落侧车轨迹（种子/时区/扩展/起停时刻），这同时是**身份审计面**（§5.26 G5 对内可审计）。
