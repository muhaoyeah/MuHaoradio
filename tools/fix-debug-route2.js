const fs = require('fs');
const sp = 'D:/MuHaoradio/resources/app/server.js';
let s = fs.readFileSync(sp, 'utf8');
const marker = "if (pn === '/api/muhao-debug-log'";
const start = s.indexOf(marker);
if (start < 0) {
  const anchor = 'const pn = url.pathname;';
  const idx = s.indexOf(anchor);
  if (idx < 0) throw new Error('no anchor');
  const block = anchor + "\n\n  if (pn === '/api/muhao-debug-log' && req.method === 'POST') {\n    let body = '';\n    req.on('data', (c) => { body += c; if (body.length > 20000) body = body.slice(0, 20000); });\n    req.on('end', () => {\n      try { fs.appendFileSync('D:/MuHaoradio/muhao-debug.log', new Date().toISOString() + ' ' + body + '\\n'); } catch (e) {}\n      res.writeHead(204); res.end();\n    });\n    return;\n  }";
  s = s.slice(0, idx) + block + s.slice(idx + anchor.length);
  fs.writeFileSync(sp, s);
  console.log('inserted');
} else {
  let i = s.indexOf('{', start);
  let depth = 0;
  for (; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  while (s[i] === '\n' || s[i] === '\r') i++;
  const block = "if (pn === '/api/muhao-debug-log' && req.method === 'POST') {\n    let body = '';\n    req.on('data', (c) => { body += c; if (body.length > 20000) body = body.slice(0, 20000); });\n    req.on('end', () => {\n      try { fs.appendFileSync('D:/MuHaoradio/muhao-debug.log', new Date().toISOString() + ' ' + body + '\\n'); } catch (e) {}\n      res.writeHead(204); res.end();\n    });\n    return;\n  }\n";
  s = s.slice(0, start) + block + s.slice(i);
  fs.writeFileSync(sp, s);
  console.log('replaced');
}
console.log('has path', fs.readFileSync(sp,'utf8').includes('D:/MuHaoradio/muhao-debug.log'));
