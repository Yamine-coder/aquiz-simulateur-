// Production test suite for extraction API - v3 with fresh active URLs
const BASE = 'https://aquiz-simulateur.vercel.app/api/annonces/extract';

let passed = 0;
let failed = 0;
let warnings = 0;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function test(name, body, expectStatus, validate) {
  process.stdout.write(`⏳ ${name}...`);
  try {
    const t0 = Date.now();
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const elapsed = Date.now() - t0;
    const data = await res.json().catch(() => ({}));
    
    if (expectStatus && res.status !== expectStatus) {
      console.log(`\r❌ ${name}: Expected ${expectStatus}, got ${res.status} (${elapsed}ms)`);
      if (data.error) console.log(`   Error: ${data.error}`);
      failed++;
      return data;
    }
    
    if (validate) {
      const result = validate(data, res.status);
      if (result === true) {
        console.log(`\r✅ ${name}: PASS (${res.status}) [${elapsed}ms] ${data.source ? `source=${data.source}` : ''}`);
        const annonce = data.data || data.annonce;
        if (annonce) {
          const a = annonce;
          const fields = Object.keys(a).filter(k => a[k] !== null && a[k] !== undefined && a[k] !== '');
          console.log(`   📊 ${fields.length} fields: ${fields.join(', ')}`);
          if (a.prix) console.log(`   💰 Prix: ${a.prix}€`);
          if (a.surface) console.log(`   📐 Surface: ${a.surface}m²`);
          if (a.ville) console.log(`   📍 Ville: ${a.ville} ${a.codePostal || ''}`);
        }
        if (data.extractionLog) {
          const methods = data.extractionLog.map(l => `${l.method}(${l.status})`).join(' → ');
          console.log(`   🔗 Cascade: ${methods}`);
        }
        passed++;
      } else if (result && result.startsWith('WARN:')) {
        console.log(`\r⚠️  ${name}: ${result} (${elapsed}ms)`);
        if (data.extractionLog) {
          const methods = data.extractionLog.map(l => `${l.method}(${l.status})`).join(' → ');
          console.log(`   🔗 Cascade: ${methods}`);
        }
        warnings++;
      } else {
        console.log(`\r❌ ${name}: ${result} (${elapsed}ms)`);
        if (data.extractionLog) {
          const methods = data.extractionLog.map(l => `${l.method}(${l.status})`).join(' → ');
          console.log(`   🔗 Cascade: ${methods}`);
        }
        console.log(`   Data:`, JSON.stringify(data).substring(0, 400));
        failed++;
      }
    } else {
      console.log(`\r✅ ${name}: Status ${res.status} (${elapsed}ms)`);
      passed++;
    }
    return data;
  } catch (e) {
    console.log(`\r❌ ${name}: ERROR - ${e.message}`);
    failed++;
    return null;
  }
}

function extractionCheck(d, s) {
  if (s === 429) return `RATE LIMITED (429)`;
  if (s === 504) return `TIMEOUT (504) - Vercel function timeout`;
  // API returns {success, source, data, fieldsExtracted, method, message, extractionLog}
  const annonce = d.data || d.annonce;
  if (s === 200 && d.success && annonce) {
    if (annonce.prix && annonce.prix > 1000) return true;
    if (annonce.surface && annonce.surface > 5 && annonce.surface < 10000) return true;
    const fields = Object.keys(annonce).filter(k => annonce[k] !== null && annonce[k] !== undefined && annonce[k] !== '');
    if (fields.length >= 5) return true;
    return `Low quality: only ${fields.length} fields, prix=${annonce.prix}, surface=${annonce.surface}`;
  }
  if (s === 200 && d.success === false && d.error && (
    d.error.includes('expiré') || d.error.includes('404') || 
    d.error.includes('supprimé') || d.error.includes('introuvable') ||
    d.error.includes('désactivé'))) 
    return `WARN: Ad expired/removed - ${d.error}`;
  if (s === 200 && !d.success) return `Extraction failed: ${d.error || 'unknown'}`;
  return `Status ${s}, success=${d.success}`;
}

console.log('========================================');
console.log('  AQUIZ Production Test Suite v3');
console.log('  ' + BASE);
console.log('  ' + new Date().toISOString());
console.log('========================================\n');

// ============================================
// SECTION 1: SECURITY TESTS (SSRF) - Skip with --skip-ssrf
// ============================================
const skipSSRF = process.argv.includes('--skip-ssrf');
if (!skipSSRF) {
console.log('--- SECURITY: SSRF Protection ---');

await test('SSRF: localhost', { url: 'http://localhost/admin' }, 400);
await test('SSRF: 192.168.x.x', { url: 'http://192.168.1.1/secret' }, 400);
await test('SSRF: 10.x.x.x', { url: 'http://10.0.0.1/internal' }, 400);
await test('SSRF: 172.16.x.x', { url: 'http://172.16.0.1/admin' }, 400);
await test('SSRF: IPv6 ::1', { url: 'http://[::1]/admin' }, 400);
await test('SSRF: no URL', {}, 400);
await test('SSRF: invalid URL', { url: 'not-a-url' }, 400);
await test('SSRF: search page', { url: 'https://www.seloger.com/list.htm?projects=2' }, 400);

console.log('');
await sleep(2000);
} else {
console.log('--- SSRF tests skipped (--skip-ssrf) ---\n');
}

// ============================================
// SECTION 2: REAL EXTRACTION TESTS
// ============================================
console.log('--- EXTRACTION: Active URLs ---');

// SeLoger - N1 API (ACTIVE)
await test('SeLoger',
  { url: 'https://www.seloger.com/annonces/achat/appartement/paris-11eme-75/bastille-popincourt/263335331.htm' },
  null, extractionCheck
);
await sleep(3000);

// SeLoger #2
await test('SeLoger #2',
  { url: 'https://www.seloger.com/annonces/achat/appartement/paris-11eme-75/263363569.htm' },
  null, extractionCheck
);
await sleep(3000);

// Orpi - was 504 timeout, now fixed with proxy + datacenter-blocked
await test('Orpi (timeout fix)',
  { url: 'https://www.orpi.com/annonce-vente-appartement-t4-dorlisheim-67120-f3753611-a331-4ef3-9790-4d5ff946c3a7/' },
  null, extractionCheck
);
await sleep(3000);

// Bien'ici - FRESH URL from today's search
await test('Bienici (fresh)',
  { url: 'https://www.bienici.com/annonce/vente/paris-14e/appartement/4pieces/ag753736-516389519' },
  null, extractionCheck
);
await sleep(3000);

// Laforêt - FRESH URL from today's search
await test('Laforet (fresh)',
  { url: 'https://www.laforet.com/agence-immobiliere/molsheim/acheter/erstein/appartement-3-pieces-52554984' },
  null, extractionCheck
);
await sleep(3000);

// Century21 - may redirect to homepage (error page detection should catch it)
await test('Century21',
  { url: 'https://www.century21.fr/trouver_logement/detail/2678498076/' },
  null, extractionCheck
);
await sleep(3000);

// LeBonCoin - may be expired (mobile API key: ba0c2dad52b3ec)
await test('LeBonCoin',
  { url: 'https://www.leboncoin.fr/ad/ventes_immobilieres/2939285498' },
  null, extractionCheck
);
await sleep(3000);

// PAP - Chrome stealth via Railway (if SCRAPER_URL configured)
await test('PAP',
  { url: 'https://www.pap.fr/annonces/appartement-paris-11e-r476879437' },
  null, extractionCheck
);
await sleep(2000);

console.log('');

// ============================================
// SUMMARY
// ============================================
console.log('========================================');
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log(`  Total: ${passed + failed + warnings} tests`);
if (failed === 0 && warnings === 0) console.log('  🎉 ALL TESTS PASSED!');
else if (failed === 0) console.log('  ✅ No failures (some warnings from expired ads)');
console.log('========================================');
