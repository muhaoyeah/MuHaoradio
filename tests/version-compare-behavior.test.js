// compareVersions / normalizeVersion 行为测试
// 目的：① 为 T-06/T-07 修改 server.js 提供兜底；② 定论交接文档 §1.4 可疑项——
// 「预发布版是否被判等」。结论：是。normalizeVersion 会剥掉 -prerelease 与 +build，
// 2.1.0-beta 与 2.1.0 判等（返回 0）。该行为由本测试钉住；是否改语义是产品决策，不在此测试中修改。
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const serverSrc = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function extractFn(name) {
  const m = serverSrc.match(new RegExp('function ' + name + '\\s*\\([\\s\\S]*?\\n}\\n'));
  assert.ok(m, 'server.js 中应存在 ' + name);
  return m[0];
}

const sandbox = vm.runInNewContext(
  extractFn('normalizeVersion') + '\n' + extractFn('compareVersions') +
  '\n({ normalizeVersion, compareVersions });', {});
const normalizeVersion = sandbox.normalizeVersion;
const compareVersions = sandbox.compareVersions;

test('normalizeVersion 剥掉 v 前缀、构建元数据与预发布后缀', () => {
  assert.strictEqual(normalizeVersion('v2.1.0'), '2.1.0');
  assert.strictEqual(normalizeVersion('2.1.0+build.7'), '2.1.0');
  assert.strictEqual(normalizeVersion('2.1.0-beta.3'), '2.1.0');
  assert.strictEqual(normalizeVersion('  V2.1.0-rc.1+meta '), '2.1.0');
  assert.strictEqual(normalizeVersion(''), '');
  assert.strictEqual(normalizeVersion(null), '');
});

test('compareVersions 常规三段比较：大于 / 小于 / 等于', () => {
  assert.strictEqual(compareVersions('2.2.0', '2.1.0'), 1);
  assert.strictEqual(compareVersions('2.1.0', '2.2.0'), -1);
  assert.strictEqual(compareVersions('2.1.0', '2.1.0'), 0);
  assert.strictEqual(compareVersions('2.1', '2.1.0'), 0);
  assert.strictEqual(compareVersions('v2.1.0', '2.1.0'), 0);
});

test('compareVersions 非数字段按 0 处理，不抛异常', () => {
  assert.strictEqual(compareVersions('2.x.0', '2.0.0'), 0);
  assert.strictEqual(compareVersions('2.x.0', '2.0.9'), -1);
  assert.strictEqual(compareVersions('', '0.0.0'), 0);
  assert.strictEqual(compareVersions('abc', '1.0.0'), -1);
});

test('【定论 §1.4 可疑项】预发布版当前被判等（行为钉住，非断言其正确）', () => {
  // 现状：2.1.0-beta 与 2.1.0 判等 → updateAvailable=false → 预发布用户收不到正式版更新提示
  assert.strictEqual(compareVersions('2.1.0', '2.1.0-beta'), 0);
  assert.strictEqual(compareVersions('2.1.0-rc.1', '2.1.0'), 0);
  // 若未来按 semver 修复（预发布 < 同号正式版），本断言应改为 -1，届时同步更新本测试
});

test('updateAvailable 判定路径与 server.js 调用方式一致：latest > current 才提示', () => {
  const updateAvailable = (latest, current) => compareVersions(latest, current) > 0;
  assert.strictEqual(updateAvailable('2.2.0', '2.1.0'), true);
  assert.strictEqual(updateAvailable('2.1.0', '2.1.0'), false);
  assert.strictEqual(updateAvailable('2.1.0', '2.1.0-beta'), false);
});
