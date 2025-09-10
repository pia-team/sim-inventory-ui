#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const { default: OpenAI } = await import('openai');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set. Provide it via .env or CI secret.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : def;
  };
  const hasFlag = (name) => {
    const onOff = args.find(a => a.startsWith(`--${name}=`));
    if (onOff) {
      const v = onOff.split('=')[1].toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    }
    return args.includes(`--${name}`);
  };

  const sourceLang = getArg('source', process.env.SOURCE_LANG || 'en');
  const languagesArg = getArg('languages', process.env.TARGET_LANGS || 'tr,de,fr');
  const targetLangs = languagesArg
    .split(',')
    .map(s => s.trim())
    .filter(l => l && l !== sourceLang);

  const mode = getArg('mode', process.env.TRANSLATE_MODE || 'missing');
  const overwrite = hasFlag('overwrite') || ['overwrite', 'full', 'force', 'reset'].includes(String(mode).toLowerCase());
  const ignoreQuota = hasFlag('ignoreQuota');

  // Try new public path first (runtime loading), then fallback to legacy src/locales
  const publicSrcPath = path.join(__dirname, 'public', 'locales', sourceLang, 'translation.json');
  const legacySrcPath = path.join(__dirname, 'src', 'locales', `${sourceLang}.json`);
  const srcPath = fs.existsSync(publicSrcPath) ? publicSrcPath : legacySrcPath;
  if (!fs.existsSync(srcPath)) {
    console.error(`ERROR: Source file not found: ${publicSrcPath} or ${legacySrcPath}`);
    process.exit(1);
  }

  const srcJson = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

  // Configurables
  const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const MAX_RETRIES = parseInt(process.env.TRANSLATE_MAX_RETRIES || '4', 10);
  const BASE_DELAY_MS = parseInt(process.env.TRANSLATE_BASE_DELAY_MS || '1000', 10);
  const THROTTLE_MS = parseInt(process.env.TRANSLATE_THROTTLE_MS || '1200', 10);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastCallTime = 0;
  const throttle = async () => {
    const now = Date.now();
    const wait = lastCallTime + THROTTLE_MS - now;
    if (wait > 0) await sleep(wait);
    lastCallTime = Date.now();
  };

  const withRetry = async (fn) => {
    let attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (err) {
        const code = err?.code || err?.error?.code;
        const status = err?.status;
        if (code === 'insufficient_quota') {
          console.error('OpenAI insufficient_quota: please add credits or adjust plan.');
          throw err;
        }
        if (status === 429 || code === 'rate_limit_exceeded') {
          if (attempt >= MAX_RETRIES) throw err;
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw err;
      }
    }
  };

  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const deepMerge = (target, patch) => {
    if (!isObject(patch)) return patch;
    const out = isObject(target) ? { ...target } : {};
    for (const k of Object.keys(patch)) {
      const pv = patch[k];
      out[k] = isObject(pv) ? deepMerge(out[k], pv) : pv;
    }
    return out;
  };
  const deepDiffMissing = (src, tgt) => {
    if (!isObject(src)) return src;
    const out = {};
    for (const k of Object.keys(src)) {
      const sv = src[k];
      const tv = tgt ? tgt[k] : undefined;
      if (isObject(sv)) {
        const child = deepDiffMissing(sv, isObject(tv) ? tv : undefined);
        if (isObject(child) && Object.keys(child).length > 0) out[k] = child;
      } else {
        if (tv === undefined || tv === null || tv === '') out[k] = sv;
      }
    }
    return out;
  };

  const extractJson = (text) => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}$/);
    return (match && match[0]) || text;
  };

  const translateSegment = async (segmentObj, from, to) => {
    const segmentStr = JSON.stringify(segmentObj);
    const userPrompt = [
      `Translate the following JSON values from ${from} to ${to}.`,
      'Rules:',
      '- Keep the JSON object structure and keys EXACTLY the same.',
      '- Do NOT translate the keys.',
      '- Preserve placeholders like {{name}}, {count, plural, ...} and any HTML tags.',
      '- Do not translate brand/product names: SIM, ICCID, IMSI, eSIM, Keycloak.',
      '- Return ONLY a valid JSON object (no extra commentary).',
      '',
      'JSON:',
      segmentStr,
    ].join('\n');

    try {
      await throttle();
      const completion = await withRetry(() =>
        openai.chat.completions.create({
          model: MODEL,
          temperature: 0,
          messages: [
            { role: 'system', content: 'You are a professional localization engine for web UIs.' },
            { role: 'user', content: userPrompt },
          ],
        })
      );

      const text = completion.choices?.[0]?.message?.content?.trim() || '{}';
      const jsonText = extractJson(text);
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.warn('Failed to parse JSON, returning original segment:', e.message);
        return segmentObj;
      }
    } catch (err) {
      const code = err?.code || err?.error?.code;
      if (ignoreQuota && code === 'insufficient_quota') {
        console.warn('Skipping translation due to insufficient_quota; returning original segment.');
        return segmentObj;
      }
      throw err;
    }
  };

  for (const lang of targetLangs) {
    console.log(`Translating ${sourceLang}.json -> ${lang}.json ...`);
    const outPath = path.join(__dirname, 'public', 'locales', lang, 'translation.json');
    const existingTarget = (fs.existsSync(outPath) && !overwrite)
      ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
      : {};
    let targetObj = existingTarget;
    const topKeys = Object.keys(srcJson);

    for (const k of topKeys) {
      const segment = { [k]: srcJson[k] };
      const missing = deepDiffMissing(segment, { [k]: existingTarget[k] });
      if (!isObject(missing) || Object.keys(missing).length === 0) {
        if (!overwrite) continue; // nothing missing for this segment
        // In overwrite mode, translate the full segment anyway
        const translated = await translateSegment(segment, sourceLang, lang);
        targetObj = deepMerge(targetObj, translated);
        continue;
      }
      const translated = await translateSegment(missing, sourceLang, lang);
      targetObj = deepMerge(targetObj, translated);
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(targetObj, null, 2) + '\n', 'utf8');

    console.log(`Wrote: ${outPath}`);
  }

  console.log('All done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
