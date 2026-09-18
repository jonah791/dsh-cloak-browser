# dsh-cloak-browser

CloakBrowser（补丁版 Chromium）生命周期工具：把 20 个加固参数固化为 start/stop/status 三个工具

## 工具
- `cloak_status`：查 CloakBrowser 状态（只认我自己的安装目录，不碰主人的实例）
- `cloak_start`：启动 CloakBrowser（可装扩展的补丁版 Chromium）：fail-closed 代理 + 指纹种子 + 与出口对齐的语言/时区 + OKX 扩展
- `cloak_stop`：停止 CloakBrowser（只杀我自己的安装目录下的进程）

## 构建与挂载

```sh
pnpm build
# 挂载到 web profile（dsh plugin-manager 或 plugin_mount）
```

组合行 id：`agent-cloak-browser`
