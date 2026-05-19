#!/usr/bin/env node
'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR  = path.join(__dirname, 'english_app');
const DIST_DIR = path.join(__dirname, 'dist');

const ENCRYPT_KEY = crypto.scryptSync('english-app-secret-2025', 'gh-pages-salt', 32);

const OBF_OPTS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

const c = { g:'\x1b[32m', y:'\x1b[33m', b:'\x1b[36m', dim:'\x1b[2m', reset:'\x1b[0m' };
const log  = m => console.log(`  ${c.g}✓${c.reset} ${m}`);
const info = m => console.log(`  ${c.dim}→ ${m}${c.reset}`);
const warn = m => console.log(`  ${c.y}⚠${c.reset} ${m}`);

function encryptData(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPT_KEY, iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  return iv.toString('hex') + ':' + enc;
}

function getAllFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) getAllFiles(full, files);
    else files.push(full);
  }
  return files;
}

function ensureDir(p) { fs.mkdirSync(path.dirname(p), { recursive: true }); }

function obfuscateJS(code, label = '') {
  try {
    return JavaScriptObfuscator.obfuscate(code, OBF_OPTS).getObfuscatedCode();
  } catch (e) {
    warn(`Obfuscate fail (${label}): ${e.message}`);
    return code;
  }
}

function minifyHTML(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

function buildDecryptRuntime() {
  const keyBytes = JSON.stringify(Array.from(ENCRYPT_KEY));
  return `<script>(function(){
const _K=new Uint8Array(${keyBytes});
async function _ik(){return crypto.subtle.importKey('raw',_K,{name:'AES-CBC'},false,['decrypt']);}
async function _dd(s){
  const[h,b]=s.split(':');
  const iv=new Uint8Array(h.match(/.{2}/g).map(x=>parseInt(x,16)));
  const raw=Uint8Array.from(atob(b),c=>c.charCodeAt(0));
  const k=await _ik();
  const dec=await crypto.subtle.decrypt({name:'AES-CBC',iv},k,raw);
  return new TextDecoder().decode(dec);
}
const _f=window.fetch.bind(window);
window.fetch=async function(u,o){
  const us=String(u);
  if(us.includes('.json.enc')){
    const r=await _f(u,o);if(!r.ok)return r;
    const t=await r.text();
    const p=await _dd(t);
    return new Response(p,{status:200,headers:{'Content-Type':'application/json'}});
  }
  return _f(u,o);
};
})();</script>`;
}

async function build() {
  const t0 = Date.now();
  console.log(`\n${c.b}╔══════════════════════════════════════╗`);
  console.log(`║   🔒  BUILD & OBFUSCATE              ║`);
  console.log(`╚══════════════════════════════════════╝${c.reset}\n`);

  if (!fs.existsSync(SRC_DIR)) throw new Error(`Không thấy source: ${SRC_DIR}`);
  if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const allFiles = getAllFiles(SRC_DIR);
  let stats = { json: 0, js: 0, copy: 0 };

  for (const srcFile of allFiles) {
    const relPath  = path.relative(SRC_DIR, srcFile);
    const ext      = path.extname(srcFile).toLowerCase();
    const basename = path.basename(srcFile);

    if (ext === '.json' && basename !== 'manifest.json') {
      const dest = path.join(DIST_DIR, relPath + '.enc');
      ensureDir(dest);
      fs.writeFileSync(dest, encryptData(fs.readFileSync(srcFile, 'utf8')));
      info(`encrypted: ${relPath}`);
      stats.json++;
    }
    else if (basename === 'manifest.json') {
      const dest = path.join(DIST_DIR, relPath);
      ensureDir(dest); fs.copyFileSync(srcFile, dest);
      stats.copy++;
    }
    else if (ext === '.js') {
      let code = fs.readFileSync(srcFile, 'utf8');
      code = code.replace(/(['"`])([^'"`\n]+\.json)(['"`])/g, (m,q1,p,q2) =>
        p.includes('manifest') ? m : `${q1}${p}.enc${q2}`
      );
      const dest = path.join(DIST_DIR, relPath);
      ensureDir(dest);
      fs.writeFileSync(dest, obfuscateJS(code, relPath));
      info(`obfuscated: ${relPath}`);
      stats.js++;
    }
    else if (basename === 'index.html') {
      let html = fs.readFileSync(srcFile, 'utf8');
      html = html.replace(/(['"`(])([^'"`()\n]+\.json)(['"`)])/g, (m,q1,p,q2) =>
        p.includes('manifest') ? m : `${q1}${p}.enc${q2}`
      );
      html = html.replace('<head>', '<head>\n' + buildDecryptRuntime());
      let scriptIdx = 0;
      html = html.replace(/<script>([\s\S]*?)<\/script>/g, (match, js) => {
        scriptIdx++;
        if (scriptIdx === 1 || js.trim().length < 30) return match;
        return `<script>${obfuscateJS(js, `script-${scriptIdx}`)}</script>`;
      });
      html = minifyHTML(html);
      const dest = path.join(DIST_DIR, relPath);
      ensureDir(dest);
      fs.writeFileSync(dest, html);
      log(`index.html → decrypt injected + obfuscated + minified`);
    }
    else {
      const dest = path.join(DIST_DIR, relPath);
      ensureDir(dest); fs.copyFileSync(srcFile, dest);
      stats.copy++;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n  ${c.dim}────────────────────────────────────${c.reset}`);
  log(`${stats.json} JSON files encrypted`);
  log(`${stats.js} JS files obfuscated`);
  log(`${stats.copy} files copied as-is`);
  log(`Done in ${elapsed}s → dist/`);
  console.log();
}

build().catch(e => {
  console.error(`\n  \x1b[31m✗ Build thất bại: ${e.message}\x1b[0m\n`);
  process.exit(1);
});
