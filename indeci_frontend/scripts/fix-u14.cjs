'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'src');
function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|html)$/.test(p)) acc.push(p);
  }
  return acc;
}
let n = 0;
for (const f of walk(root)) {
  let t = fs.readFileSync(f, 'utf8');
  if (!t.includes('\u0014')) continue;
  t = t.replace(/\u0014/g, '\u2014');
  fs.writeFileSync(f, t, 'utf8');
  n++;
}
console.log('files', n);
