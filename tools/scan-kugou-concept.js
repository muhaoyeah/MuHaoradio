const fs=require('fs');const path=require('path');
const root='C:/Users/MUHAO/Desktop/新建文件夹/muhaoradio';
function rg(dir, re, max=40){
  const out=[];
  (function walk(d){
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p=path.join(d,e.name);
      if(e.isDirectory()){
        if(e.name==='node_modules'||e.name==='dist') continue;
        walk(p);
      } else if(/\.(js|html|css|md)$/.test(e.name)){
        const t=fs.readFileSync(p,'utf8');
        if(re.test(t)) out.push(path.relative(root,p).replace(/\\/g,'/'));
      }
    }
  })(dir);
  return out.slice(0,max);
}
console.log('=== kugou-concept files ===');
console.log(rg(root,/kugou-concept|酷狗概念/i).join('\n'));
console.log('\n=== provider labels in login UI snippets ===');
const files=[
  'public/js/modules/08-account/03-login-modal-flows.js',
  'public/js/modules/08-account/02-login-status.js',
  'desktop/main.js',
  'desktop/preload.js',
  'server.js'
];
for(const f of files){
  const t=fs.readFileSync(path.join(root,f),'utf8');
  const hits=[...t.matchAll(/kugou[\w-]{0,30}|酷狗[^\n]{0,40}/gi)].slice(0,15).map(m=>m[0]);
  console.log('\n'+f+':');
  console.log([...new Set(hits)].join(' | '));
}
