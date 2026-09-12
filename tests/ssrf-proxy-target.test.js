// SSRF 防护（T-06）单元测试：validateProxyTarget 必须拒绝私网/回环/元数据地址与非 http(s) 协议
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
// validateProxyTarget / isPrivateOrReservedIp / dnsLookupAll / fetchProxyValidated 一起载入
const asyncFns = [
  serverSrc.match(/async function validateProxyTarget\([\s\S]*?\n}\n/)[0],
  serverSrc.match(/async function fetchProxyValidated\([\s\S]*?\n}\n/)[0],
];
const sandbox = {
  console, URL, dns: require('dns'), net: require('net'),
  MINERADIO_SSRF_ENFORCE: false,
  fetch: async () => { throw new Error('fetch should not be called in these tests'); },
  ssrfRecordLog: [],
  SSRF_ENFORCE: false,
};
vm.createContext(sandbox);
vm.runInContext(
  'const SSRF_RECORD_LIMIT = 200;\n' +
  extractFn('ssrfLog') + '\n' +
  extractFn('isPrivateOrReservedIp') + '\n' +
  extractFn('dnsLookupAll') + '\n' +
  asyncFns.join('\n') + '\n',
  sandbox);
const { validateProxyTarget, isPrivateOrReservedIp } = sandbox;

test('isPrivateOrReservedIp 拒绝全部私网/回环/保留段', () => {
  for (const ip of [
    '127.0.0.1', '127.255.0.9', '10.0.0.1', '10.255.255.255',
    '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1',
    '192.0.2.1', '198.51.100.1', '203.0.113.1', '240.1.2.3',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', '::ffff:127.0.0.1',
  ]) assert.strictEqual(isPrivateOrReservedIp(ip), true, ip + ' 应被拒');
  for (const ip of ['8.8.8.8', '1.1.1.1', '203.0.114.9', '104.21.5.6']) {
    assert.strictEqual(isPrivateOrReservedIp(ip), false, ip + ' 应放行');
  }
});

test('validateProxyTarget 拒绝非 http(s) 协议', async () => {
  for (const u of ['file:///etc/passwd', 'gopher://127.0.0.1/', 'ftp://x/', 'not-a-url']) {
    const r = await validateProxyTarget(u);
    assert.strictEqual(r.ok, false, u);
  }
});

test('validateProxyTarget 拒绝字面私网/回环 IP 与云元数据地址', async () => {
  for (const u of [
    'http://127.0.0.1:3000/api/login/cookie',
    'http://169.254.169.254/latest/meta-data',
    'http://192.168.1.1/admin',
    'http://10.0.0.2/',
    'http://[::1]/',
    'http://localhost:3000/',
    'http://foo.local/',
  ]) {
    const r = await validateProxyTarget(u);
    assert.strictEqual(r.ok, false, u + ' 应被拒，实际: ' + JSON.stringify(r));
  }
});

test('validateProxyTarget 放行公网域名（真实 DNS 解析）', async () => {
  const r = await validateProxyTarget('https://example.com/');
  assert.strictEqual(r.ok, true, JSON.stringify(r));
});

test('server.js 不再含硬编码 ACAO *', () => {
  const hits = serverSrc.match(/Access-Control-Allow-Origin': '\*'/g) || [];
  assert.strictEqual(hits.length, 0, '仍有 ' + hits.length + ' 处硬编码星号');
});

test('封面与音频代理入口已挂 rejectIfNonLocalOrigin 与 fetchProxyValidated', () => {
  const cover = serverSrc.match(/if \(pn === '\/api\/cover'\) \{[\s\S]*?\n  \}\n/)[0];
  const audio = serverSrc.match(/if \(pn === '\/api\/audio'\) \{[\s\S]*?\n  \}\n/)[0];
  assert.ok(cover.includes('rejectIfNonLocalOrigin'), 'cover 缺来源闸');
  assert.ok(audio.includes('rejectIfNonLocalOrigin'), 'audio 缺来源闸');
  assert.ok(cover.includes('fetchProxyValidated'), 'cover 未走 SSRF 校验');
  assert.ok(audio.includes('fetchProxyValidated'), 'audio 未走 SSRF 校验');
});
