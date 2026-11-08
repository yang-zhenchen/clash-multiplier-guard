// ============================================================
// 高倍率节点保护 · Clash Party / Clash Verge Rev 通用覆写脚本
// ============================================================
// 作用：让「自动选择」这类自动测速组（url-test / fallback / load-balance）
//       在测速和选路时跳过倍率 >= THRESHOLD 的节点。
//       手动选择组（select）保持原样，高倍率节点随时还能手动挑。
//
// 原理：mihomo 的策略组支持 exclude-filter（Go/RE2 正则），
//       在测速/选路前先剔除名字匹配的节点。
//       正则没法做「数字大小比较」，所以用枚举/字符类来实现 >= 阈值。
//
// 注意：名字里没写倍率的节点（如「香港宽频D1」「台湾D2」）无法判断倍率，
//       仍然会参与自动选择。要连它们一起清掉，得改成白名单模式（只留名字里标了 0.x 的）。
//
// 安装：
//   Clash Party   → 覆写 → 输入 URL 导入，然后在订阅上启用
//   Clash Verge Rev → 订阅 → 全局扩展脚本（粘贴本文件内容）
// ============================================================

// 倍率阈值：>= 该值的节点不参与自动选择。
//   1    = 只留 1 倍以下（0.2 / 0.4 / 0.5 / 0.6 这类折扣节点）
//   3/4/6 = 允许 1~2.9 倍之类的常规节点参与，只挡高倍率
// 必须是整数；小于 1 按 1 处理。
var THRESHOLD = 1

// 只处理名字匹配的自动组（避免误伤别人的自定义组）；留空则只处理类型为自动的组
var GROUP_MATCH = /自动选择|自动测速|自动切换|Auto/i

// true = 不问名字，所有 url-test / fallback / load-balance 组都处理
var ALL_AUTO_GROUPS = false

// 是否把匹配明细打进日志（排错时打开）
var VERBOSE = true

// ---- 以下一般不用改 ----

// 构造 >= min 的倍率正则，形如 [1] [1.0] [4.0] [10.0] [120]
// 正则做不了数字比较，用「个位字符类 + 两位以上整数」来等价表达 >= min
function buildPattern(min) {
  var ints
  if (min <= 1) {
    ints = '[1-9]\\d*' // 任何 >= 1 的整数
  } else if (min <= 9) {
    ints = '[' + min + '-9]|[1-9]\\d+' // 3..9，以及所有 >= 10 的整数
  } else if (min <= 10) {
    ints = '[1-9]\\d+'
  } else {
    // 10 以上的阈值：直接枚举（很少用到）
    var alts = []
    for (var i = min; i < 100; i++) alts.push(String(i))
    ints = alts.join('|') + '|[1-9]\\d{2,}'
  }
  // 兼容半角 [] 与全角【】
  return '[\\[【]\\s*(?:' + ints + ')(?:\\.\\d+)?\\s*[\\]】]'
}

function main(config) {
  if (!config) return config

  var groups = config['proxy-groups'] || []
  var pattern = buildPattern(THRESHOLD)

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
    console.log('[multiplier-guard] 阈值 >= ' + THRESHOLD + ' 倍')
    console.log('[multiplier-guard] 生效组: ' + (applied.length ? applied.join(', ') : '未找到自动组'))
    console.log('[multiplier-guard] 命中节点 ' + hits.length + '/' + proxies.length + ' 个')
    for (var k = 0; k < hits.length; k++) console.log('  - ' + hits[k])
  } else {
    console.log('[multiplier-guard] 已应用: ' + (applied.length ? applied.join(', ') : '未找到自动组'))
  }

  return config
}
