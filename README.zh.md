# dsh-command-code-usage

**Command Code 计划用量监控**插件，用于 DeepSeek Harness：Web GUI 里的悬浮用量坞，
实时显示剩余额度与 5h 滚动 / 本周两个额度窗口；并附带一份现成的
**Command Code 提供商预设**，让 API Key 能在标准的「设置 → 模型」页面里填写。

## 为什么需要它

DSH 里**没有** Command Code 这个提供商。查证过程（供参考）：

- 遍历 DSH 全部 240 个包搜 `commandcode` / `command-code` / `Command Code`：**零命中**。
- DSH 的多提供商后端是 `@earendil-works/pi-ai@0.85.1`（由 `dsh-llm-pi-ai` 驱动）。
  它的目录里有 39 个提供商——包括 `opencode` 和 `opencode-go`（所以参考插件
  `dsh-opencode-go-usage` 能直接读 Key）——但**没有 `commandcode`**。

所以本插件用两条路解决「Key 从哪来」：

1. **提供商预设**（`cordis.patch.yml`）：把 `command-code` 注入 `dsh-llm-pi-ai`
   的组合 base 层。于是 Command Code 出现在 Web「设置 → 模型」页面，有标准的
   API Key 输入框；顺带它也能被选作聊天模型。
2. **用量坞内联输入**（兜底）：即使你从不打开模型页面，也能直接在坞里填 Key。

两者写的是**同一处**凭据（`~/.dsh/.credentials.yaml` 的 `refs` 下，
引用名 `COMMAND_CODE_API_KEY`），所以填一遍即可，互相等价。

## 安装

```sh
# 从本地路径安装到 web profile（Web GUI 用的就是 web profile）：
dsh plugin --profile web add /home/cyilin/dev/dsh-command-code-usage

# 装完重启对应 profile（Web UI 即 dsh web）。
```

`dsh plugin` 只是 pnpm 的转发器；它会把这个包追加进 profile 的
`dsh.profile.bundles`，profile 启动时把本包的 `cordis.patch.yml` 合入组合树。

## 配置 API Key

三条路，任选其一：

**A. 用量坞内联输入（最快）** —— 未配置时展开坞，面板里直接出现 Key 输入框。
Key 会保存到 `~/.dsh/.credentials.yaml`，随后立即验证。

**B. 设置 → 模型** —— 打开「Command Code」卡片，填入 API Key。

**C. 环境变量 / 手写凭据文件** —— 设 `COMMAND_CODE_API_KEY`，或写入
`~/.dsh/.credentials.yaml`：

```yaml
version: 1
refs:
  COMMAND_CODE_API_KEY: user_xxxxxxxx
```

> 注意：**继承的进程环境变量优先级最高且只读**。如果你在启动 dsh 前设了
> `COMMAND_CODE_API_KEY`，坞内和模型页的保存都会被拒绝（这是凭据服务刻意的
> 设计：能写却被环境变量遮蔽的写入会假装成功）。此时用量坞会直接告诉你改用
> 环境变量并重启，而不是静默失败。

在 <https://commandcode.ai/> 创建 Key。

## 用量坞

右下角一枚毛玻璃悬浮徽章（通过 Web shell 的 `shell.overlay` 插槽挂载，
拿不到该插槽时退回 body portal）：

- **徽章（收起态）**：两个迷你双层圆环直接显示 5h 滚动 / 本周额度——外环为
  **剩余**额度占比（未使用时为满圆环，随消耗缩短；弧按已用占比着色：
  <60% 绿 / ≥60% 橙 / ≥85% 红），内环为窗口剩余时间（品牌蓝，实时递减）；
  旁附 5h 窗口的秒级倒计时（`↻3h25m`）与状态点。
- **面板（点击展开）**：账户名 + 计划标签；额度池大字（剩余金额）、已用百分比
  进度条、三个来源（订阅 / 购买 / 赠送）；两个窗口行（双层环 + `已用 / 总额` +
  重置倒计时）；本期请求数与 Token 数。底部为更新时间、清除 Key、立即刷新。
- **拖动**：按住徽章拖到任意位置（位移超过 4px 才算拖动，普通点击仍是展开/收起）；
  位置存 localStorage，窗口缩放时自动夹回视口。面板跟随徽章移动，顶部空间不足时
  翻到下方，贴近左缘时改为向左展开。
- 未配置 / 异常时面板内联给出配置指引；抓取失败**不会让徽章空白**。

## 显示稳定性

数据与健康状态分离：某次刷新失败（网络超时、接口异常）时，用量坞**继续显示上次
成功获取的数据**，仅状态点转黄、底部出现「显示上次数据」淡提示。只有从未成功获取
过时才显示错误 / 未配置状态。

Command Code 的四个接口是独立可选的：`whoami` 必须成功（它提供其余接口要用的
`orgId`），另外三个各自独立——某个套餐没有额度赠予仍会有用量数据，一个接口失败
不会丢掉其余数据。缺失的段落会在面板底部明确列出，不会把「没有数据」显示成 0。

## 配置项

`cordis.patch.yml` 里那条挂载行：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `apiKeyEnv` | string | `COMMAND_CODE_API_KEY` | 凭据引用；需与提供商路由的 `apiKeyEnv` 一致 |
| `apiKey` | string | — | 直接指定 Key（不推荐） |
| `apiBase` | string | `https://api.commandcode.ai` | 账户 API 起点 |
| `refreshMs` | number | `60000` | 自动刷新间隔（最小 10000） |
| `timeoutMs` | number | `15000` | 单次请求批次超时 |

## 提供商预设

预设声明了**两条**路由，因为 Command Code 是「按模型选协议」的（`claude-*` 走
Anthropic Messages，其余走 OpenAI 兼容），而 DSH 的 `api` 字段是**路由级**的：

| 路由 | 协议 | baseURL | 覆盖模型 |
| --- | --- | --- | --- |
| `command-code` | `openai-completions` | `.../provider/v1` | GPT / Gemini / DeepSeek / Grok / Kimi / Qwen / GLM / MiniMax 等 20 个 |
| `command-code-claude` | `anthropic-messages` | `.../provider` | Claude 5 个 |

baseURL 的写法来自实际 SDK 的拼法（已核对源码）：

- OpenAI 兼容：`baseURL` + `/chat/completions` → 所以要带 `/v1`，
  即 `https://api.commandcode.ai/provider/v1/chat/completions`。
- Anthropic：pi-ai 先剥掉末尾 `/v1`，再由 `@anthropic-ai/sdk` 拼 `/v1/messages`
  → 所以写 `.../provider`，最终同样得到 `.../provider/v1/messages`。

**两条路由共用同一个 `apiKeyEnv`**，所以用量坞和聊天模型读的是同一个 Key。

预设注入的是组合 **base 层**；你在 `~/.dsh/settings.yaml` 的
`llm-pi-ai.providers` 里写的同名字段会**逐字段深合并覆盖**它（设置服务用
`mergeLayers` 深合并）。所以预设开箱可用，你的改动优先。

### 关于模型容量

`contextWindow` / `maxTokens` 是**按各模型公开规格人工填的近似值**，不是从接口读到的
权威值（Command Code 的模型列表接口不下发容量）。若某个模型实际窗口不同，在
设置 → 模型 里单独改该模型即可。

`reasoningEfforts` 的等级来自参考实现 `pi-commandcode-provider@0.7.0` 从
`command-code@1.54.0` 同步出的目录。其中 `off:` 留空值是 DSH 文档规定的写法，
含义是「支持关闭，关闭时不发送该字段」。

少数模型（Kimi K2.7 Code、Qwen3.8 Plus、MiMo v2.5、Inkling）在目录里**没有可选的
思考等级**，因此没有声明 `reasoningEfforts`——DSH 对没有该字段的手工声明模型不会
暴露等级选择器，但它们仍可能在服务端自行推理。

## 数据来源

四个接口，与官方 `cmd` CLI 的 `/usage` 命令一致：

| 接口 | 提供 |
| --- | --- |
| `GET /alpha/whoami` | 账户身份 + `org.id` |
| `GET /alpha/billing/credits?orgId=` | 额度池 + 5h/本周窗口 |
| `GET /alpha/billing/subscriptions?orgId=` | 计划 id/状态 + 计费周期 |
| `GET /alpha/usage/summary?orgId=&since=` | 花费 / 请求数 / Token |

认证只需 `Authorization: Bearer user_...`，这些只读接口不需要额外请求头，也不需要
workspace id 或会话 Cookie。响应结构已对照 `pi-commandcode-provider@0.7.0` 的
`src/quota.ts` 源码核实，未知字段一律容忍。

## 开发

```sh
pnpm install
pnpm build     # tsc（Host + client 类型检查并产出）+ esbuild（客户端打包）
pnpm verify    # 离线校验：纯函数规则 + cordis.patch.yml 的 schema 校验
```

### 结构

| 路径 | 作用 |
| --- | --- |
| `src/index.ts` | Host：定时抓取、缓存、四条 HTTP 路由 |
| `src/usage.ts` | Command Code 账户 API 客户端（纯解析函数可单测） |
| `src/types.ts` | 纯类型，Host 与浏览器共用（零 import） |
| `src/client/usage-model.ts` | 纯显示投影与 wire 辅助（无 React/DOM） |
| `src/client/UsageDock.tsx` | 悬浮坞组件 |
| `src/client/styles.ts` | 样式表（CSS 字符串，注入 `<style>`；按 `--dsw-alias-*` 主题化） |
| `src/client/index.tsx` | 浏览器入口（注册进 `shell.overlay`，退回 body portal） |
| `scripts/build-client.mjs` | 打包成 `__ModuleLoader__` 协议产物 |
| `scripts/verify.mjs` | 离线校验 |
| `cordis.patch.yml` | 组合补丁：挂载本插件 + 注入提供商预设 |

### 客户端打包

`lib/client.js` 按 DSH 的 `clientBundle` 协议产出：一个
`window.__ModuleLoader__.load({ id, factory })` 的 CJS 闭包工厂，`id` 从
package.json 读取（避免改名后注册到过期 id）。`react` / `react/jsx-runtime` /
`react-dom/client` 保持 external，从 shell 的冻结模块表解析，因此坞与 shell 共用
同一个 React 实例。

坞**刻意不依赖** `@deepseek-ai/dsh-client-ui-primitives`：该包在本部署里不在磁盘上，
只作为 shell 的种子模块存在，其导出面是带版本的主机契约。本坞只需要普通 DOM 元素
加自己的样式表，因此不引入这项风险。

## License

MIT
