/**
 * dsh-cloak-browser：CloakBrowser（补丁版 Chromium）生命周期工具：把 20 个加固参数固化为 start/stop/status 三个工具
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const name = "agent-cloak-browser"
export const inject = ["tools"] as const

export interface Config {
  enabled: boolean
}
export const Config = z.object({
  enabled: z.boolean().default(true),
})

export function apply(ctx: Context, config: Config): void {
  const logger = ctx.logger("agent-cloak-browser")

    ctx.tools.register(defineTool({
      name: "cloak_status",
      description: "查 CloakBrowser 状态（只认我自己的安装目录，不碰主人的实例）",
      parameters: {},
      output: {
        schema: {"type":"object","additionalProperties":false,"properties":{"ok":{"type":"boolean","required":true},"text":{"type":"string"}}},
        render: (_a: unknown, v: any) => [{ type: 'text', text: JSON.stringify(v) }],
      },
      async execute(args: Record<string, unknown>) {
        const __raw = await (async () => {
          const run = promisify(execFile);
          const script = 'E:\\alice\\projects\\self\\alice-identity\\scripts\\cloak-browser.ps1';
          const { stdout, stderr } = await run('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File', script, 'status'], { timeout: 60000, windowsHide: true });
          return (stdout + stderr).trim();
        })()
        if (__raw && typeof __raw === 'object' && 'ok' in (__raw as any)) return __raw as any
        return { ok: true, text: typeof __raw === 'string' ? __raw : JSON.stringify(__raw) } as any
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
        const __raw = await (async () => {
          const run = promisify(execFile);
          const script = 'E:\\alice\\projects\\self\\alice-identity\\scripts\\cloak-browser.ps1';
          const a = ['-NoProfile','-ExecutionPolicy','Bypass','-File', script, 'start'];
          if (seed) a.push('-Seed', String(seed));
          if (extension !== undefined) a.push('-Extension', String(extension));
          if (lang) a.push('-Lang', String(lang));
          if (timezone) a.push('-Timezone', String(timezone));
          const { stdout, stderr } = await run('powershell.exe', a, { timeout: 120000, windowsHide: true });
          return (stdout + stderr).trim();
        })()
        if (__raw && typeof __raw === 'object' && 'ok' in (__raw as any)) return __raw as any
        return { ok: true, text: typeof __raw === 'string' ? __raw : JSON.stringify(__raw) } as any
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
      async execute(args: Record<string, unknown>) {
        const __raw = await (async () => {
          const run = promisify(execFile);
          const script = 'E:\\alice\\projects\\self\\alice-identity\\scripts\\cloak-browser.ps1';
          const { stdout, stderr } = await run('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File', script, 'stop'], { timeout: 60000, windowsHide: true });
          return (stdout + stderr).trim();
        })()
        if (__raw && typeof __raw === 'object' && 'ok' in (__raw as any)) return __raw as any
        return { ok: true, text: typeof __raw === 'string' ? __raw : JSON.stringify(__raw) } as any
      },
    }))
}
