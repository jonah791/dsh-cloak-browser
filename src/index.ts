/**
 * dsh-cloak-browser：CloakBrowser（补丁版 Chromium）生命周期工具：把 20 个加固参数固化为 start/stop/status 三个工具
 *
 * 2026-09-22（t-ef0af5ff）修三处生成模板遗留缺陷：
 * ① `enabled` 原先只声明不消费（撒谎的开关）→ 现在 apply() 首行消费它；
 * ② 收尾恒 `ok:true`（判定分支不可达）→ 现在按脚本裁决/退出码判定。**对 stop 尤其要紧**：
 *    失败被报成成功 ⇒「以为停了，其实还在跑」；
 * ③ 脚本路径硬编码 → 现在走配置（可指向测试夹具，验收可离线做）。
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { verdictFrom } from './verdict.js'

export const name = "agent-cloak-browser"
export const inject = ["tools"] as const

export interface Config {
  enabled: boolean
  scriptPath: string
}
export const Config = z.object({
  enabled: z.boolean().default(true),
  scriptPath: z.string().default('E:\\alice\\projects\\self\\alice-identity\\scripts\\cloak-browser.ps1'),
})

export function apply(ctx: Context, config: Config): void {
  // enabled 必须在 apply() 里被消费：显式 false 时挂载但不注册任何工具。
  // 只认 === false（未配置/undefined 视为启用），避免把「没写」误判成「关掉」（t-ef0af5ff）。
  if (config.enabled === false) return

  const logger = ctx.logger("agent-cloak-browser")
  const run = promisify(execFile)

  /** 调 cloak-browser.ps1：失败**必须**是 ok:false（停止失败被报成成功＝假活）。 */
  async function callScript(extra: string[], timeout: number): Promise<{ ok: boolean; text: string }> {
    try {
      const { stdout, stderr } = await run(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', config.scriptPath, ...extra],
        { timeout, windowsHide: true },
      )
      return verdictFrom(stdout + stderr, true)
    } catch (e) {
      // 非零退出码 / 超时 / 脚本不存在 ⇒ 结构化失败，不冒充成功。
      const err = e as { stderr?: unknown; message?: unknown }
      const detail = typeof err.stderr === 'string' && err.stderr.trim() !== ''
        ? err.stderr
        : String(err.message ?? e)
      const v = verdictFrom(detail, false)
      logger.warn(`cloak-browser 调用失败（${extra.join(' ')}）：${v.text}`)
      return { ok: false, text: v.text }
    }
  }

  ctx.tools.register(defineTool({
    name: "cloak_status",
    description: "查 CloakBrowser 状态：① 我自己的实例（只认我的安装目录，不碰主人的实例）② 全机只读巡检（复用唯一判据 scripts/orphan-process-audit.mjs，报「父进程已死 ∧ 正在烧核」的进程）。**只报告，不处置**——stop 的范围一字未变。",
    parameters: {},
    output: {
      schema: {"type":"object","additionalProperties":false,"properties":{"ok":{"type":"boolean","required":true},"text":{"type":"string"}}},
      render: (_a: unknown, v: any) => [{ type: 'text', text: JSON.stringify(v) }],
    },
    async execute(_args: Record<string, unknown>) {
      return await callScript(['status'], 60000) as any
    },
  }))

  ctx.tools.register(defineTool({
    name: "cloak_start",
    description: "启动 CloakBrowser（可装扩展的补丁版 Chromium）：fail-closed 代理 + 指纹种子 + 与出口对齐的语言/时区 + OKX 扩展",
    parameters: {"seed":{"type":"number","description":"指纹种子（默认 48213）；同种子=同身份"},"extension":{"type":"string","description":"扩展目录（默认 OKX 钱包）"},"lang":{"type":"string","description":"语言（默认 ja）"},"timezone":{"type":"string","description":"时区（默认 Asia/Tokyo）"}},
    output: {
      schema: {"type":"object","additionalProperties":false,"properties":{"ok":{"type":"boolean","required":true},"text":{"type":"string"}}},
      render: (_a: unknown, v: any) => [{ type: 'text', text: JSON.stringify(v) }],
    },
    async execute(args: {
  seed?: number
  extension?: string
  lang?: string
  timezone?: string
}) {
      const { seed, extension, lang, timezone } = args as any
      const a: string[] = ['start']
      if (seed) a.push('-Seed', String(seed));
      if (extension !== undefined) a.push('-Extension', String(extension));
      if (lang) a.push('-Lang', String(lang));
      if (timezone) a.push('-Timezone', String(timezone));
      return await callScript(a, 120000) as any
    },
  }))

  ctx.tools.register(defineTool({
    name: "cloak_stop",
    description: "停止 CloakBrowser（只杀我自己的安装目录下的进程）",
    parameters: {},
    output: {
      schema: {"type":"object","additionalProperties":false,"properties":{"ok":{"type":"boolean","required":true},"text":{"type":"string"}}},
      render: (_a: unknown, v: any) => [{ type: 'text', text: JSON.stringify(v) }],
    },
    async execute(_args: Record<string, unknown>) {
      return await callScript(['stop'], 60000) as any
    },
  }))
}
