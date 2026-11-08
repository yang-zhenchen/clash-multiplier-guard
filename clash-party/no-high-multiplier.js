// ============================================================
// 高倍率节点保护 · Clash Party / Clash Verge Rev 通用覆写脚本
// ============================================================
// 作用：让「自动选择」这类自动测速组（url-test / fallback / load-balance）
//       在测速和选路时跳过倍率超过阈值的节点。
//       手动选择组（select）保持原样，高倍率节点随时还能手动挑。
//
// 原理：mihomo 的策略组支持 exclude-filter（Go/RE2 正则），
//       在测速/选路前先剔除名字匹配的节点。
//       正则没法做「数字大小比较」，所以用字符类 + 分支来等价表达 > / >= 阈值。
//
// 注意：名字里没写倍率的节点（如「香港宽频D1」「台湾D2」）无法判断倍率，
//       仍然会参与自动选择。
//
// 安装：
//   Clash Party   → 覆写 → 输入 URL 导入，然后在订阅上启用
//   Clash Verge Rev → 订阅 → 全局扩展脚本（粘贴本文件内容）
// ============================================================

// ---- 阈值与比较口径 ----
//   THRESHOLD=1, INCLUDE_EQUAL=false → 只排「>1」：1.0 倍保留（0.x 与 1.0 都参与自动选择）
//   THRESHOLD=1, INCLUDE_EQUAL=true  → 排「>=1」：只留 0.x 折扣节点
//   THRESHOLD=3, INCLUDE_EQUAL=true  → 3 倍及以上不参与自动选择
var THRESHOLD = 1
var INCLUDE_EQUAL = false

// 只处理名字匹配的自动组（避免误伤别人的自定义组）
var GROUP_MATCH = /自动选择|自动测速|自动切换|Auto/i

// true = 不问名字，所有 url-test / fallback / load-balance 组都处理
var ALL_AUTO_GROUPS = false

// 是否把匹配明细打进日志（排错时打开）
var VERBOSE = true

// ---- 以下一般不用改 ----

// 构造倍率判定正则
//   includeEqual = true  → 匹配 >= min（如 [3] [3.0] [10.0] [120]）
//   includeEqual = false → 匹配 >  min（如 [1.5] [2.0] [10.0]，但 [1] [1.0] 不算）
function buildPattern(min, includeEqual) {
  min = Math.max(0, Math.floor(min))
  var body

  if (includeEqual) {
    if (min <= 1) {
      body = '[1-9]\\d*(?:\\.\\d+)?' // 任何 >= 1 的数
    } else if (min <= 9) {
      body = '(?:[' + min + '-9]|[1-9]\\d+)(?:\\.\\d+)?' // 个位 min~9，或两位及以上的整数
    } else if (min <= 10) {
      body = '[1-9]\\d+(?:\\.\\d+)?'
    } else {
      var alts = []
      for (var i = min; i < 100; i++) alts.push(String(i))
      body = '(?:' + alts.join('|') + '|[1-9]\\d{2,})(?:\\.\\d+)?'
    }
  } else {
    if (min <= 8) {
      // 整数部分 > min，或者整数部分正好是 min 但小数位非零（1.01 / 1.5 / 1.10）
      body = '(?:[' + (min + 1) + '-9]|[1-9]\\d+)(?:\\.\\d+)?|' + min + '\\.\\d*[1-9]\\d*'
    } else {
      var list = []
      for (var k = min + 1; k < 100; k++) list.push(String(k))
      body = '(?:' + list.join('|') + '|[1-9]\\d{2,})(?:\\.\\d+)?'
    }
  }

  // 兼容半角 [] 与全角【】
  return '[\\[【]\\s*(?:' + body + ')\\s*[\\]】]'
}

function main(config) {
  if (!config) return config

  var groups = config['proxy-groups'] || []
  var pattern = buildPattern(THRESHOLD, INCLUDE_EQUAL)
  var compare = (INCLUDE_EQUAL ? '>= ' : '> ') + THRESHOLD

  var applied = []
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i]
    if (!g || typeof g.name !== 'string') continue

    var isAuto = g.type === 'url-test' || g.type === 'fallback' || g.type === 'load-balance'
    if (!isAuto) continue
    if (!ALL_AUTO_GROUPS && GROUP_MATCH && !GROUP_MATCH.test(g.name)) continue

    var current = typeof g['exclude-filter'] === 'string' ? g['exclude-filter'] : ''
    if (current.indexOf(pattern) === -1) {
      // 幂等：重复执行不会把同一条正则叠加两次
      g['exclude-filter'] = current ? current + '|' + pattern : pattern
    }
    applied.push(g.name + ' (' + g.type + ')')
  }

  if (VERBOSE) {
    var proxies = config.proxies || []
    var re = new RegExp(pattern)
    var hits = []
    for (var j = 0; j < proxies.length; j++) {
      var n = proxies[j] && proxies[j].name
      if (typeof n === 'string' && re.test(n)) hits.push(n)
    }
    console.log('[multiplier-guard] 阈值 ' + compare + ' 倍')
    console.log('[multiplier-guard] 生效组: ' + (applied.length ? applied.join(', ') : '未找到自动组'))
    console.log('[multiplier-guard] 命中节点 ' + hits.length + '/' + proxies.length + ' 个')
    for (var m = 0; m < hits.length; m++) console.log('  - ' + hits[m])
  } else {
    console.log('[multiplier-guard] 已应用: ' + (applied.length ? applied.join(', ') : '未找到自动组'))
  }

  return config
}
