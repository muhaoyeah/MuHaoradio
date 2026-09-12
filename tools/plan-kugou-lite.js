const fs=require('fs');const path=require('path');
const root='C:/Users/MUHAO/Desktop/新建文件夹/muhaoradio';
function head(file, re, n=12){
  const t=fs.readFileSync(path.join(root,file),'utf8');
  const lines=t.split(/\n/);
  const hits=[];
  lines.forEach((l,i)=>{ if(re.test(l)) hits.push((i+1)+':'+l.trim().slice(0,140)); });
  console.log('\n## '+file+' ('+hits.length+' hits)');
  hits.slice(0,n).forEach(h=>console.log(h));
}
head('kugou-api.js', /module\.exports|function |platform|lite|cookie|login|song.*url|search/i, 25);
head('server.js', /kugou|KUGOU|concept|provider/i, 40);
head('public/js/modules/05-playback/11-provider-fallback.js', /kugou|provider/i, 20);
head('public/js/modules/05-playback/07-search.js', /kugou|provider/i, 20);
head('desktop/preload.js', /[Kk]ugou/);
head('package.json', /kugou|dependencies/);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
console.log('\ndeps', Object.keys(pkg.dependencies||{}).join(', '));
console.log('optional', Object.keys(pkg.optionalDependencies||{}).join(', '));
