# 高倍率节点保护 · no-high-multiplier

> 仓库地址：<https://github.com/yang-zhenchen/clash-multiplier-guard>
> 订阅里节点名带 `[4.0]`、`[6.0]` 这类倍率标记时，让自动选择组跳过它们。

机场通常会在节点名里标出计费倍率，比如 `🇭🇰 香港GIA1 [4.0]`、`🇯🇵 日本星链D5 [10.0]`。
「自动选择」这类按延迟测速的策略组只挑最快，不看倍率，于是很容易长期挂在高倍率节点上，流量跑得飞快。

本仓库给出一套开关：**自动组跳过倍率超过阈值的节点，手动选择组保持原样**，高倍率节点想用随时能手选。
默认阈值 `1` 且按「大于」比较——`1.0` 倍的常规节点保留，2 倍及以上不参与自动选择；想更严就改 `INCLUDE_EQUAL = true`（只留 0.x 折扣节点）。
三种实现共用同一套判定规则，按客户端挑一个用。

## 用哪个文件

| 客户端 | 文件 | 生效方式 | 高倍率节点还能手选 |
| --- | --- | --- | --- |
| Clash Party | `clash-party/no-high-multiplier.js` | 覆写 → 填 URL 导入 → 在订阅上启用 | ✅ |
| Clash Verge Rev（mihomo 内核） | `clash-party/no-high-multiplier.js` | 订阅 → 全局扩展脚本，粘贴内容 | ✅ |
| 手机 / 路由器 / 其他客户端 | `substore/no-high-multiplier.js` | Sub-Store → 订阅 → 节点操作 → 脚本 | ❌（节点从订阅里删掉） |
| 手写 mihomo 配置 / OpenClash | `mihomo/exclude-filter.yaml` | 合并进配置 | ✅（组级用法） |

## 安装

### Clash Party

1. 打开 **覆写**（Override），点导入，填 URL：
   ```
   https://raw.githubusercontent.com/yang-zhenchen/clash-multiplier-guard/main/clash-party/no-high-multiplier.js
   ```
2. 回到订阅页，在你的订阅上 **启用这个覆写**（关键一步，不启用不生效）。
3. 更新订阅或重启内核，覆写 → 执行日志里应出现：
   ```
   [multiplier-guard] 阈值 > 1 倍
   [multiplier-guard] 生效组: ♻️ 自动选择 (url-test)
   [multiplier-guard] 命中节点 15/100 个
   ```

> raw.githubusercontent.com 在国内经常打不开，可换 jsDelivr：
> `https://cdn.jsdelivr.net/gh/yang-zhenchen/clash-multiplier-guard@main/clash-party/no-high-multiplier.js`
> 也可以直接把 .js 下载下来，放到 Clash Party 的 `data/override/` 目录，再在覆写页面里打开。

### Clash Verge Rev

订阅页 → **全局扩展脚本**（Global Script）→ 把 `clash-party/no-high-multiplier.js` 的内容整段粘进去 → 保存。
函数签名是 `function main(config)`，两边通用，不用改。

### Sub-Store（手机等一切客户端）

订阅 → 编辑 → **节点操作** → 添加 → 类型选 **脚本** → 粘贴 `substore/no-high-multiplier.js` 的内容。
**脚本参数**填阈值（如 `3`），不填默认 3。
之后所有订阅这条链接的客户端（Clash Meta for Android、FlClash、Karing、Shadowrocket、OpenClash……）拿到的节点里都不会有高倍率节点。

### mihomo 原生 / OpenClash

见 [`mihomo/exclude-filter.yaml`](mihomo/exclude-filter.yaml)，两种写法：

- **组级** `exclude-filter`：只影响该自动组的选择，高倍率节点仍可手选；
- **provider 级** `exclude-filter`：节点拉下来就剔除，所有引用它的组都干净。

## 改阈值

JS 版顶部两个变量（`THRESHOLD` 必须是整数）：

```js
var THRESHOLD = 1      // 阈值
var INCLUDE_EQUAL = false // false = 只排「大于」阈值；true = 连等于阈值的一起排
```

| THRESHOLD | INCLUDE_EQUAL | 效果 |
| --- | --- | --- |
| `1` | `false` | **当前默认**：`1.0` 保留，2 倍及以上排除 |
| `1` | `true` | 只留 0.x 折扣节点（1.0 也排掉） |
| `3` | `true` | 3 倍及以上排除，1~2.9 倍正常参与 |

YAML 场景用工具生成正则，再粘进 `exclude-filter`：
```bash
node tools/build-pattern.mjs 4        # >= 4
node tools/build-pattern.mjs 1 --gt   # > 1
```

判定覆盖的写法：`[1]` `[1.0]` 不受影响；`[1.5]` `[2]` `[3.0]` `[10.0]` `[120]` `【1.5】` 被排除。

## 原理

`exclude-filter` 是 mihomo 策略组（以及 proxy-provider）的字段，值是 Go/RE2 正则，内核在测速与选路前先把名字匹配的节点剔除。

正则做不了「数字大小比较」，所以用等价写法表达「> 阈值」或「≥ 阈值」：

```
>　1：\[\s*(?:(?:[2-9]|[1-9]\d+)(?:\.\d+)?|1\.\d*[1-9]\d*)\s*[\]】]
          └ 整数部分 2~9 或 >=10  └ 1 后面小数位非零（1.5 / 1.01），1.0 不算
>= 1：\[\s*[1-9]\d*(?:\.\d+)?\s*[\]】]
>= 3：\[\s*(?:[3-9]|[1-9]\d+)(?:\.\d+)?\s*[\]】]
```

## 已知限制

- **名字里没写倍率的节点挡不住**。像 `🇭🇰 香港宽频D1`、`🇹🇼 台湾D2`、`马来西亚1` 这类节点名没有 `[x.y]` 标记，脚本读不出倍率，默认视为「未知、保留」，仍会参与自动选择。这类节点占比不低（示例订阅 100 个里有 29 个）。
- **依赖节点名里的倍率格式**。机场改名或用 `4x`、`倍率4` 这类写法时，需要同步改正则（Sub-Store 版已额外支持 `4x` / `x4` / `4倍`）。
- JS 版只处理**名字匹配** `自动选择|自动测速|自动切换|Auto` 的自动组；组名不同就改 `GROUP_MATCH`，或把 `ALL_AUTO_GROUPS` 设为 `true`（所有 url-test / fallback / load-balance 组都处理）。
- 覆写是订阅级设置，订阅更新不会丢；但**换新订阅要重新启用**。
- 阈值按名字判断，和机场实际计费口径未必 100% 一致，建议自己留一档余量。

## 目录

```
clash-party/no-high-multiplier.js   Clash Party / Verge Rev 覆写脚本
substore/no-high-multiplier.js      Sub-Store 节点级过滤脚本
mihomo/exclude-filter.yaml          mihomo 原生片段（组级 / provider 级）
tools/build-pattern.mjs             按阈值生成 exclude-filter 正则
```
