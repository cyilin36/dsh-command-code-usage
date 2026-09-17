#!/usr/bin/env node
/**
 * 离线冒烟校验 for dsh-command-code-usage.
 *
 * 对固定 fixture 跑纯函数规则（用量解析 + 悬浮坞的显示投影），不碰网络、
 * 不依赖运行中的 DSH 实例。需要先 `pnpm build`（lib/ 已生成）。
 *
 * 用 DSH 安装自带的 js-yaml 校验 cordis.patch.yml 能按 DSH 的 YAML 方言解析，
 * 并用 llm-pi-ai 的 Config schema 校验注入的提供商预设——补丁写错只会在启动
 * 时炸掉整个 profile，所以这里提前拦下。
 *
 * 用法: node scripts/verify.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DSH_PKGS = new URL(
  '../../@deepseek-ai/dsh/node_modules/@deepseek-ai/',
  import.meta.url,
).pathname

const { assembleUsage, normalizeResetAt, parseCredits, parseWhoami, windowLimitsFromCredits } =
  await import('../lib/usage.js')
const {
  clampDockPosition, computePanelLayout, formatCredits, formatCreditsCompact,
  formatRelative, formatRemaining, formatRemainingCompact, formatTokens, healthLabel,
  PANEL_GAP_PX, percentTone, planLabel, poolView, remainingRatio, stateHasUsage,
  usageWindows, WINDOW_PERIOD_MS,
} = await import('../lib/client/usage-model.js')

let failures = 0
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures += 1
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('用量解析')
{
  const whoami = { org: { id: 'org_1', login: 'acme' }, user: { userName: 'wu', keyName: 'laptop' } }
  const credits = {
    credits: { monthlyCredits: 40, purchasedCredits: 10, freeCredits: 5 },
    windowLimits: {
      fiveHour: { used: 3, cap: 12, resetAt: '2026-08-15T19:40:30.751Z' },
      weekly: { used: 30, cap: 120, resetAt: 1_770_000_000_000 },
    },
  }
  const subscription = {
    data: { planId: 'goat', status: 'active', currentPeriodStart: '2026-08-01T00:00:00.000Z' },
  }
  const summary = { totalCost: 12.5, totalCount: 340, totalTokens: 1_500_000 }

  const usage = assembleUsage(whoami, credits, subscription, summary)
  check('完整样本可解析', usage !== undefined)
  check('账户登录名', usage?.account?.login === 'acme', usage?.account?.login)
  check('API Key 名称', usage?.account?.keyName === 'laptop')
  check('额度池求和', usage?.credits?.remaining === 55, String(usage?.credits?.remaining))
  check('计划 id', usage?.subscription?.planId === 'goat')
  check('计划周期起点归一为毫秒', usage?.subscription?.currentPeriodStart === Date.parse('2026-08-01T00:00:00.000Z'))
  check('用量汇总', usage?.summary?.totalCost === 12.5 && usage?.summary.totalTokens === 1_500_000)
  check('两个窗口都在', usage?.credits?.windows.length === 2)
  check('窗口顺序 fiveHour 先', usage?.credits?.windows[0]?.window === 'fiveHour')
  check('无缺失段', usage?.unavailable.length === 0, JSON.stringify(usage?.unavailable))

  check('空 body 拒绝', assembleUsage(null, credits, subscription, summary) === undefined)
  check('缺 org 的 whoami 拒绝', parseWhoami({ user: {} }) === null)
  check('account 字段兜底 userName', parseWhoami({ user: { userName: 'solo' } })?.account.login === 'solo')

  check('credits 非对象拒绝', parseCredits({ credits: 'x' }) === null)
  check('三个来源全缺则拒绝', parseCredits({ credits: { monthlyCredits: undefined } }) === null)
  check('缺 purchased/free 补 0', parseCredits({ credits: { monthlyCredits: 7 } })?.purchased === 0)
  check('0/0 窗口被丢弃', windowLimitsFromCredits({ weekly: { used: 0, cap: 0 } }).length === 0)
  check('缺 cap 的窗口被丢弃', windowLimitsFromCredits({ weekly: { used: 3 } }).length === 0)
  check('窗口顺序 fiveHour 先',
    windowLimitsFromCredits({
      weekly: { used: 1, cap: 2 },
      fiveHour: { used: 1, cap: 2 },
    }).map((w) => w.window).join(',') === 'fiveHour,weekly')
  check('未观察到的窗口被忽略',
    windowLimitsFromCredits({ daily: { used: 1, cap: 2 } }).length === 0)
  // 明确不做月度窗口：API 只给 fiveHour/weekly，monthly 必须被忽略而不是猜出来
  check('monthly 不作为窗口被接受',
    windowLimitsFromCredits({ monthly: { used: 20, cap: 100 } }).length === 0)

  // 部分可用：只有 credits 成功
  const partial = assembleUsage(whoami, credits, null, null)
  check('部分样本可解析', partial !== undefined)
  check('缺失段被记录', partial?.unavailable.join(',') === 'subscription,usage', partial?.unavailable.join(','))
  check('缺失段始终带原因（无网络原因时给兜底）',
    partial?.unavailableReasons?.usage === '响应中没有可用的 usage 数据',
    partial?.unavailableReasons?.usage)

  // 回归：缺失段必须带上「为什么」，否则线上无法排查（usage 段消失过一次）
  const withReasons = assembleUsage(whoami, credits, null, null, {
    subscription: 'Command Code 返回 HTTP 400',
    usage: '响应中没有可用的 usage 数据',
  })
  check('缺失段带原因',
    withReasons?.unavailableReasons?.subscription === 'Command Code 返回 HTTP 400',
    withReasons?.unavailableReasons?.subscription)
  check('原因按段分别记录',
    withReasons?.unavailableReasons?.usage === '响应中没有可用的 usage 数据')
  check('原因不泄漏到可用段', withReasons?.unavailableReasons?.credits === undefined)
  const unusableBody = assembleUsage(whoami, credits, null, { nothing: true })
  check('接口成功但 body 不可用时给出兜底原因',
    unusableBody?.unavailableReasons?.usage === '响应中没有可用的 usage 数据',
    unusableBody?.unavailableReasons?.usage)
  check('仅 whoami 不算样本', assembleUsage(whoami, null, null, null) === undefined)

  console.log('  时间戳归一')
  check('ISO 字符串', normalizeResetAt('2026-08-15T19:40:30.751Z') === Date.parse('2026-08-15T19:40:30.751Z'))
  check('秒级 epoch 转毫秒', normalizeResetAt(1_770_000_000) === 1_770_000_000_000)
  check('毫秒级 epoch 原样', normalizeResetAt(1_770_000_000_000) === 1_770_000_000_000)
  check('数字字符串', normalizeResetAt('1770000000') === 1_770_000_000_000)
  check('非法值返回 null', normalizeResetAt('nope') === null)
  check('缺失返回 null', normalizeResetAt(undefined) === null)
}

console.log('窗口投影')
{
  const usage = {
    credits: {
      monthly: 40, purchased: 10, free: 5, remaining: 55,
      windows: [
        { window: 'fiveHour', used: 3, cap: 12, resetAt: Date.parse('2026-08-15T19:40:30.751Z') },
        { window: 'weekly', used: 30, cap: 120, resetAt: Date.parse('2026-08-17T00:00:00.751Z') },
      ],
    },
    unavailable: [],
  }
  const windows = usageWindows(usage)
  check('只有两个窗口', windows.map((w) => w.key).join(',') === 'fiveHour,weekly',
    windows.map((w) => w.key).join(','))
  check('5h 百分比', Math.round(windows[0].percent) === 25, String(windows[0].percent))
  check('5h 剩余额度', windows[0].remaining === 9)
  check('本周百分比', Math.round(windows[1].percent) === 25, String(windows[1].percent))
  check('标签', windows[0].label === '5h 滚动' && windows[1].label === '本周')
  check('周期常量',
    WINDOW_PERIOD_MS.fiveHour === 5 * 3600_000
    && WINDOW_PERIOD_MS.weekly === 7 * 86400_000
    && Object.keys(WINDOW_PERIOD_MS).length === 2)
  check('无 credits 时为空', usageWindows(undefined).length === 0)
  check('cap 为 0 跳过', usageWindows({ credits: { monthly: 0, purchased: 0, free: 0, remaining: 0, windows: [{ window: 'weekly', used: 0, cap: 0, resetAt: null }] }, unavailable: [] }).length === 0)

  // 关键：补齐 summary 后也不能冒出第三行 —— 本插件不做任何月度推算
  check('有 summary 也不产生本月行',
    usageWindows({ ...usage, summary: { totalCost: 12.5, totalCount: 3 } })
      .map((w) => w.key).join(',') === 'fiveHour,weekly')
  check('有计费周期也不产生本月行',
    usageWindows({
      ...usage,
      summary: { totalCost: 12.5, totalCount: 3 },
      subscription: { planId: 'goat', status: 'active', currentPeriodStart: null, currentPeriodEnd: 1_800_000_000_000 },
    }).length === 2)

  console.log('额度池')
  const pool = poolView({ credits: usage.credits, summary: { totalCost: 12.5, totalCount: 3 }, unavailable: [] })
  check('剩余额度', pool?.remaining === 55)
  check('来源拆分', pool?.monthly === 40 && pool?.purchased === 10 && pool?.free === 5)
  check('已花金额原样', pool?.spent === 12.5)
  check('额度池不产出百分比', !('percentUsed' in (pool ?? {})))
  check('无 credits 返回 undefined', poolView(undefined) === undefined)
  const poolNoSummary = poolView({ credits: usage.credits, unavailable: ['usage'] })
  check('缺 summary 时 spent 为 null', poolNoSummary?.spent === null)
  check('缺 summary 时仍报剩余', poolNoSummary?.remaining === 55)
}

console.log('状态与文案')
{
  const withData = {
    usage: { credits: { monthly: 1, purchased: 0, free: 0, remaining: 1, windows: [] }, unavailable: [] },
    usageFetchedAt: 1,
    health: { status: 'error', fetchedAt: 2, apiKeyEnv: 'K', writable: true },
  }
  const noData = { health: { status: 'unconfigured', fetchedAt: 3, apiKeyEnv: 'COMMAND_CODE_API_KEY', writable: true } }
  check('有数据可用', stateHasUsage(withData) === true)
  check('无数据不可用', stateHasUsage(noData) === false)
  check('null 不可用', stateHasUsage(null) === false)

  check('连接中文案', healthLabel(null) === '连接中…')
  check('实时文案', healthLabel({ ...withData, health: { status: 'ok', fetchedAt: 1, apiKeyEnv: 'K', writable: true } }) === '实时')
  check('过期文案', healthLabel(withData) === '数据过期')
  check('未配置文案', healthLabel(noData) === '未配置')
  check('异常文案', healthLabel({ health: { status: 'error', fetchedAt: 1, apiKeyEnv: 'K', writable: true } }) === '异常')

  check('计划名 goat→GOAT', planLabel('goat') === 'GOAT')
  check('计划名 go→Go', planLabel('go') === 'Go')
  check('计划名 null', planLabel(null) === null)
  check('计划名未知则美化', planLabel('ultra_pro') === 'Ultra Pro', planLabel('ultra_pro'))
}

console.log('着色与格式化')
{
  check('tone ok <60', percentTone(16) === 'ok')
  check('tone warn =60', percentTone(60) === 'warn')
  check('tone danger =85', percentTone(85) === 'danger')
  check('tone 容忍 NaN', percentTone(Number.NaN) === 'ok')

  check('金额两位小数', formatCredits(12.5) === '$12.50')
  check('金额非法', formatCredits(Number.NaN) === '$—')
  check('紧凑金额 <100', formatCreditsCompact(12.55) === '$12.6', formatCreditsCompact(12.55))
  check('紧凑金额 >=100', formatCreditsCompact(1234) === '$1234')
  check('Token B', formatTokens(1_500_000_000) === '1.5B')
  check('Token M', formatTokens(1_500_000) === '1.5M')
  check('Token k', formatTokens(1500) === '1.5k')
}

console.log('倒计时')
{
  const now = Date.parse('2026-08-15T12:00:00.000Z')
  check('剩余天数+小时', formatRemaining(Date.parse('2026-08-19T12:00:00.000Z'), now) === '4天0小时')
  check('剩余小时+分', formatRemaining(Date.parse('2026-08-15T15:30:00.000Z'), now) === '3小时30分')
  check('剩余分+秒', formatRemaining(Date.parse('2026-08-15T12:05:30.000Z'), now) === '5分30秒')
  check('剩余秒', formatRemaining(Date.parse('2026-08-15T12:00:45.000Z'), now) === '45秒')
  check('已重置', formatRemaining(now - 1000, now) === '已重置')
  check('缺失为 —', formatRemaining(null, now) === '—')

  check('紧凑 天', formatRemainingCompact(Date.parse('2026-08-19T12:00:00.000Z'), now) === '4d')
  check('紧凑 天+时', formatRemainingCompact(Date.parse('2026-08-18T15:00:00.000Z'), now) === '3d3h')
  check('紧凑 时+分', formatRemainingCompact(Date.parse('2026-08-15T15:30:00.000Z'), now) === '3h30m')
  check('紧凑 分+秒补零', formatRemainingCompact(Date.parse('2026-08-15T12:05:07.000Z'), now) === '5m07s', formatRemainingCompact(Date.parse('2026-08-15T12:05:07.000Z'), now))
  check('紧凑 秒', formatRemainingCompact(Date.parse('2026-08-15T12:00:09.000Z'), now) === '9s')
  check('紧凑 缺失为 —', formatRemainingCompact(null, now) === '—')

  check('相对 刚刚', formatRelative(now, now + 3000) === '刚刚')
  check('相对 秒', formatRelative(now, now + 30_000) === '30秒前')
  check('相对 分', formatRelative(now, now + 5 * 60_000) === '5分钟前')
  check('相对 时', formatRelative(now, now + 3 * 3600_000) === '3小时前')
  check('相对 天', formatRelative(now, now + 50 * 3600_000) === '2天前')
  check('相对 未定义', formatRelative(undefined, now) === '—')

  console.log('窗口剩余比例')
  check('剩余一半', remainingRatio(now + 30 * 60_000, 3600_000, now) === 0.5)
  check('超上限夹到 1', remainingRatio(now + 90 * 60_000, 3600_000, now) === 1)
  check('已过为 0', remainingRatio(now - 1000, 3600_000, now) === 0)
  check('null 为 0', remainingRatio(null, 3600_000, now) === 0)
  check('容忍 NaN', remainingRatio(Number.NaN, 3600_000, now) === 0)
}

console.log('悬浮坞定位')
{
  const viewport = { w: 1000, h: 800 }
  const inside = clampDockPosition({ x: 50, y: 60 }, { w: 120, h: 48 }, viewport)
  check('视口内位置不变', inside.x === 50 && inside.y === 60)
  const tl = clampDockPosition({ x: -20, y: -5 }, { w: 120, h: 48 }, viewport)
  check('左上拉回', tl.x === 0 && tl.y === 0)
  const br = clampDockPosition({ x: 1000, y: 900 }, { w: 120, h: 48 }, viewport)
  check('右下拉回', br.x === 880 && br.y === 752)
  const over = clampDockPosition({ x: -10, y: 100 }, { w: 1200, h: 1000 }, viewport)
  check('超大徽章夹到 0', over.x === 0 && over.y === 0)

  const badge = { w: 120, h: 48 }
  const panel = { w: 336, h: 420 }
  check('顶部空间不足则下翻', computePanelLayout({ x: 800, y: 20 }, badge, panel, viewport).below === true)
  check('空间足够则上翻', computePanelLayout({ x: 800, y: 600 }, badge, panel, viewport).below === false)
  check('默认右对齐', computePanelLayout({ x: 600, y: 600 }, badge, panel, viewport).useLeft === false)
  const left = computePanelLayout({ x: 0, y: 600 }, badge, panel, viewport)
  check('贴左缘则左对齐', left.useLeft === true && left.leftOffset === 0)
  const narrow = { w: 500, h: 800 }
  const nudge = computePanelLayout({ x: 200, y: 600 }, badge, panel, narrow)
  check('窄视口内推回', nudge.useLeft === true && nudge.leftOffset < 0, String(nudge.leftOffset))
  check('内推后不溢出', nudge.leftOffset + 200 >= 0 && 200 + panel.w + nudge.leftOffset <= narrow.w)
  check('间隔常量为正', PANEL_GAP_PX === 12)
}

console.log('cordis.patch.yml')
{
  const DSH_NODE_MODULES = '/home/cyilin/.nvm/versions/node/v24.19.0/lib/node_modules/@deepseek-ai/dsh/node_modules'
  let yaml
  let entryListSchema
  let PiAiConfig
  try {
    yaml = (await import(`${DSH_NODE_MODULES}/js-yaml/index.js`)).default
    ;({ entryListSchema } = await import(`${DSH_NODE_MODULES}/@deepseek-ai/cordis-plugin-include/lib/index.js`))
    ;({ Config: PiAiConfig } = await import(`${DSH_NODE_MODULES}/@deepseek-ai/dsh-llm-pi-ai/lib/index.js`))
  } catch (error) {
    console.log(`  SKIP  无法加载 DSH 校验依赖（${error.message.slice(0, 60)}）`)
  }
  if (yaml !== undefined) {
    const patchPath = fileURLToPath(new URL('../cordis.patch.yml', import.meta.url))
    let doc
    try {
      doc = yaml.load(readFileSync(patchPath, 'utf8'), { schema: entryListSchema })
      check('按 DSH YAML 方言可解析', true)
    } catch (error) {
      check('按 DSH YAML 方言可解析', false, error.message)
    }
    if (doc !== undefined) {
      check('顶层是数组', Array.isArray(doc))
      const insert = doc.find((e) => e.insert)
      check('有 insert 条目挂载本插件', insert !== undefined)
      check('挂载的包名与 package.json 一致',
        insert?.insert?.[0]?.name === JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).name,
        insert?.insert?.[0]?.name)
      check('用量坞 API Key 引用与提供商一致',
        insert?.insert?.[0]?.config?.apiKeyEnv === 'COMMAND_CODE_API_KEY')

      const pi = doc.find((e) => e.id === 'llm-pi-ai')
      check('按 id 覆盖 llm-pi-ai 行', pi !== undefined)
      if (pi !== undefined) {
        check('llm-pi-ai 覆盖带 config.providers', pi.config?.providers !== undefined)
        // off: 必须解析成字符串键（YAML 1.1 会把它当布尔）——JSON_SCHEMA 下为字符串
        const efforts = pi.config?.providers?.['command-code']?.models?.[0]?.reasoningEfforts
        check('reasoningEfforts 的 off 是字符串键', Object.keys(efforts ?? {}).includes('off'),
          JSON.stringify(Object.keys(efforts ?? {})))
        check('off 值为 null（表示支持但不发送）', efforts?.off === null)

        // 每条路由的 apiKeyEnv 必须一致，否则用量坞和聊天模型读不同凭据
        const refs = new Set(Object.values(pi.config.providers).map((p) => p.apiKeyEnv))
        check('所有路由共用同一凭据引用', refs.size === 1 && [...refs][0] === 'COMMAND_CODE_API_KEY', [...refs].join(','))

        if (PiAiConfig !== undefined) {
          try {
            const resolved = PiAiConfig(pi.config)
            check('通过 llm-pi-ai Config schema 校验', true)
            const routes = Object.entries(resolved.providers ?? {})
            check('声明了两条路由（两种协议）', routes.length === 2, String(routes.length))
            const apis = new Set(routes.map(([, p]) => p.api))
            check('两条路由协议不同', apis.size === 2, [...apis].join(','))
            check('Claude 路由走 anthropic-messages',
              routes.some(([r, p]) => p.api === 'anthropic-messages' && r === 'command-code-claude'))
            check('非 Claude 路由走 openai-completions',
              routes.some(([, p]) => p.api === 'openai-completions'))
            // anthropic 协议下 SDK 会自己补 /v1/messages，baseURL 必须以 /provider 结尾
            const claude = resolved.providers['command-code-claude']
            check('Claude 路由 baseURL 不带 /v1', claude.baseURL.endsWith('/provider'), claude.baseURL)
            check('OpenAI 路由 baseURL 带 /v1',
              resolved.providers['command-code'].baseURL.endsWith('/provider/v1'),
              resolved.providers['command-code'].baseURL)
            for (const [route, profile] of routes) {
              check(`${route} 每个模型都有 id`, profile.models.every((m) => typeof m.id === 'string' && m.id !== ''))
              check(`${route} 每个模型都有容量`, profile.models.every((m) => m.contextWindow > 0 && m.maxTokens > 0))
            }
          } catch (error) {
            check('通过 llm-pi-ai Config schema 校验', false, error.message)
          }
        }
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} 项校验失败`)
  process.exit(1)
}
console.log('\n全部校验通过')
