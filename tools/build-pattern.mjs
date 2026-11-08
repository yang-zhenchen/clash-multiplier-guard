#!/usr/bin/env node
// 打印倍率判定正则，方便手写 YAML 时复制
// 用法：
//   node tools/build-pattern.mjs 4         >= 4
//   node tools/build-pattern.mjs 3 --gt    >  3
//   node tools/build-pattern.mjs 1 --gt    >  1（1.0 保留）
import { argv } from 'node:process'

const min = Number(argv[2] ?? 3)
const exclusive = argv.includes('--gt')
if (!Number.isFinite(min) || min < 0) {
  console.error('用法: node tools/build-pattern.mjs <阈值> [--gt]')
  process.exit(1)
}

const m = Math.max(0, Math.floor(min))
let body

if (!exclusive) {
  if (m <= 1) body = '[1-9]\\d*(?:\\.\\d+)?'
  else if (m <= 9) body = `(?:[${m}-9]|[1-9]\\d+)(?:\\.\\d+)?`
  else if (m <= 10) body = '[1-9]\\d+(?:\\.\\d+)?'
  else {
    const alts = []
    for (let i = m; i < 100; i++) alts.push(String(i))
    body = `(?:${alts.join('|')}|[1-9]\\d{2,})(?:\\.\\d+)?`
  }
} else if (m <= 8) {
  body = `(?:[${m + 1}-9]|[1-9]\\d+)(?:\\.\\d+)?|${m}\\.\\d*[1-9]\\d*`
} else {
  const alts = []
  for (let i = m + 1; i < 100; i++) alts.push(String(i))
  body = `(?:${alts.join('|')}|[1-9]\\d{2,})(?:\\.\\d+)?`
}

const pattern = `[\\[【]\\s*(?:${body})\\s*[\\]】]`
console.log(`阈值 ${exclusive ? '>' : '>='} ${m} 倍：`)
console.log(pattern)
console.log('\nYAML 单引号写法：')
console.log(`exclude-filter: '${pattern}'`)
