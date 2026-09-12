const fs=require('fs');
const path=require('path');
const inst='D:/MuHaoradio/resources/app';

// Fix/ensure minimal debug log route for verification then we'll keep it gated or remove
{
  let s=fs.readFileSync(path.join(inst,'server.js'),'utf8');
  // Remove broken/old block if any - from "if (pn === '/api/muhao-debug-log'" through matching closing
  const start=s.indexOf("if (pn === '/api/muhao-debug-log'");
  if(start>=0){
    // find end by brace count from start
    let i=s.indexOf('{', start); let depth=0;
    for(;i<s.length;i++){
      if(s[i]==='{') depth++;
      else if(s[i]==='}'){ depth--; if(depth===0){ i++; break; } }
    }
    // include trailing newlines
    while(s[i]==='\n'||s[i]==='\r') i++;
    s=s.slice(0,start)+s.slice(i);
    console.log('stripped old debug route');
  }
  // Insert clean route after pathname parse
  const anchor="const pn = url.pathname;";
  const insert=`const pn = url.pathname;

  if (pn === '/api/muhao-debug-log' && req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      fs.appendFileSync(path.join(__dirname, 'muhao-debug.log'), new Date().toISOString() + ' ' + body + '\n');
    } catch (e) {}
    res.writeHead(204); res.end(); return;
  }`;
  if(!s.includes(anchor)) throw new Error('anchor missing');
  // only first occurrence near request handler - replace first
  s=s.replace(anchor, insert);
  fs.writeFileSync(path.join(inst,'server.js'), s);
  console.log('install debug route ready');
}

// Instrument splash lightly in INSTALL only for one run
{
  const p=path.join(inst,'public/js/modules/10-shell/03-splash.js');
  let t=fs.readFileSync(p,'utf8');
  if(!t.includes('MUHAO_SPLASH_TRACE')){
    const trace=`function muhaoSplashTrace(msg){ try{ var x=new XMLHttpRequest(); x.open('POST','/api/muhao-debug-log',true); x.setRequestHeader('Content-Type','text/plain;charset=utf-8'); x.send('MUHAO_SPLASH_TRACE '+msg); }catch(e){} }
`;
    t=t.replace('function dismissSplash(opts) {', trace+'function dismissSplash(opts) {\n  muhaoSplashTrace("dismiss instant="+!!(opts&&opts.instant));');
    t=t.replace('function markSplashReadyToEnter() {', 'function markSplashReadyToEnter() {\n  muhaoSplashTrace("ready");');
    t=t.replace("splashTimer = setTimeout(markSplashReadyToEnter, 1500);", "muhaoSplashTrace('timer-1500'); splashTimer = setTimeout(markSplashReadyToEnter, 1500);");
    t=t.replace('if (startupFastSkipPreference) {\n    dismissSplash({ instant: true });', 'muhaoSplashTrace("init fastSkip="+!!startupFastSkipPreference);\n  if (startupFastSkipPreference) {\n    dismissSplash({ instant: true });');
    fs.writeFileSync(p,t);
    console.log('install splash traced');
  }
}

try{ fs.unlinkSync(path.join(inst,'muhao-debug.log')); }catch(e){}
