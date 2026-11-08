// ============================================================
// 高倍率节点保护 · Sub-Store 脚本操作
// ============================================================
// 作用：在订阅处理阶段直接删掉倍率 >= 阈值的节点。
//       因为是在「订阅」这一层做的，所以所有客户端都通用：
//       Clash Meta for Android / FlClash / Karing / Shadowrocket / OpenClash……
//       只要它订阅的是 Sub-Store 输出的这条链接即可。
//
// 安装：Sub-Store → 订阅 → 编辑 → 节点操作 → 添加 → 类型选「脚本」
//       脚本内容粘贴本文件；支持参数（脚本参数里填 3 表示 >= 3 倍，默认也是 3）
//
// 注意：与 Clash Party 覆写版不同，这里是把节点从订阅里彻底删掉，
//       客户端里就再也选不到高倍率节点了。若你还想手动挑，
//       用 clash-party/no-high-multiplier.js 那一版（只在自动组里排除）。
// ============================================================

async function operator(proxies = [], targetPlatform, context) {
  // 参数：$arguments 是 Sub-Store 注入的「脚本参数」数组，取第一个当阈值
  var arg
  if (typeof $arguments !== 'undefined' && $arguments) {
    arg = Array.isArray($arguments) ? $arguments[0] : $arguments
  }
  var threshold = parseFloat(String(arg == null ? '' : arg).trim())
  if (!isFinite(threshold) || threshold <= 0) threshold = 1 // 默认 1：只留 1 倍以下的折扣节点

  // 从节点名里解析倍率：支持 [4.0] 【4】 1.5x x1.5 4倍
  function multiplierOf(name) {
    var s = String(name || '')
    var m = s.match(/[\[【]\s*(\d+(?:\.\d+)?)\s*[\]】]/)
    if (m) return parseFloat(m[1])
    m = s.match(/(\d+(?:\.\d+)?)\s*[xX×倍]/)
    if (m) return parseFloat(m[1])
    m = s.match(/[xX×]\s*(\d+(?:\.\d+)?)/)
    if (m) return parseFloat(m[1])
    return null // 名字里没写倍率 → 视为未知，保留
  }

  var kept = []
  var dropped = []
  for (var i = 0; i < proxies.length; i++) {
    var p = proxies[i]
    if (!p || typeof p !== 'object') continue
    var mult = multiplierOf(p.name)
    if (mult !== null && mult >= threshold) dropped.push(p.name + ' [' + mult + ']')
    else kept.push(p)
  }

  console.log('[multiplier-guard] 阈值 >= ' + threshold + ' 倍 | 删除 ' + dropped.length + ' 个，保留 ' + kept.length + ' 个')
  for (var j = 0; j < dropped.length; j++) console.log('  - ' + dropped[j])

  return kept
}
