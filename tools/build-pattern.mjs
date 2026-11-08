#!/usr/bin/env node
// 打印某个阈值对应的 exclude-filter 正则，方便手写 YAML 时复制
// 用法：node tools/build-pattern.mjs 4

const min = Number(process.argv[2] ?? 3)
if (!Number.isFinite(min) || min <= 0) {
  console.error('用法: node tools/build-pattern.mjs <阈值，例如 3/4/6/10>')
  process.exit(1)
}

let ints
if (min <= 9) {
  ints = `[${min}-9]|[1-9]\\d+`
} else if (min <= 10) {
  ints = '[1-9]\\d+'
} else {
  const alts = []
  for (let i = min; i < 100; i++) alts.push(String(i))
  ints = `${alts.join('|')}|[1-9]\\d{2,}`
}

const pattern = `[\\[【]\\s*(?:${ints})(?:\\.\\d+)?\\s*[\\]】]`
console.log(`阈值 >= ${min} 倍：`)
console.log(pattern)
console.log('\nYAML 单引号写法：')
console.log(`exclude-filter: '${pattern}'`)
