'use strict';

/**
 * Repair mixed mojibake from PowerShell UTF-8 mishandling:
 * 1) UTF-8 multibyte sequences shown as â + € + (latin1-like third char)
 * 2) Pares Latin1 tipo Ã³ deben corregirse manualmente o con sustituciones
 *    acotadas; no usar Buffer.from(…,'latin1') sobre archivos UTF-8 completos
 *    (daña guiones largos, viñetas, etc.).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|html|scss|css|json)$/.test(p)) acc.push(p);
  }
  return acc;
}

/** Third character of broken triple -> UTF-8 continuation byte after E2 80 */
const THIRD_TO_BYTE = new Map([
  [0x201d, 0x94], // em dash —
  [0x00ba, 0xba], // ›
  [0x00a6, 0xa6], // …
  [0x00a2, 0xa2], // •
]);

function fixEuroTriples(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c0 = str.charCodeAt(i);
    const c1 = str.charCodeAt(i + 1);
    const c2 = str.charCodeAt(i + 2);
    if (c0 === 0xe2 && c1 === 0x20ac && THIRD_TO_BYTE.has(c2)) {
      const b2 = THIRD_TO_BYTE.get(c2);
      out += Buffer.from([0xe2, 0x80, b2]).toString('utf8');
      i += 2;
      continue;
    }
    out += str[i];
  }
  return out;
}

function hasLegacyLatin1Mojibake(str) {
  return /Ã.|Â¿|Â¡/.test(str);
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const t = fixEuroTriples(original);
  if (hasLegacyLatin1Mojibake(t)) {
    console.error(
      'fix-mojibake: aún hay secuencias tipo Ã…; revisar manualmente:',
      path.relative(root, filePath),
    );
  }
  if (t !== original) {
    fs.writeFileSync(filePath, t, 'utf8');
    return true;
  }
  return false;
}

let files = 0;
for (const f of walk(root)) {
  if (processFile(f)) files++;
}
console.log(JSON.stringify({ filesRewritten: files }, null, 0));
