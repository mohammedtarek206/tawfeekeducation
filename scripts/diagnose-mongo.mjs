// MongoDB Connection Diagnostic Script
// Run: node scripts/diagnose-mongo.mjs
import dns from 'dns';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
const envFile = readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envVars = {};
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[key] = val;
}

const MONGODB_URI = envVars['MONGODB_URI'];

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Parse URI safely (without printing credentials)
let parsedUri;
try {
    parsedUri = new URL(MONGODB_URI);
} catch (e) {
    console.error('❌ MONGODB_URI is not a valid URL:', e.message);
    process.exit(1);
}

const isSRV = MONGODB_URI.startsWith('mongodb+srv://');
const hostname = parsedUri.hostname;
const dbName = parsedUri.pathname.slice(1) || '(none)';

console.log('\n========================================');
console.log('  MongoDB Connection Diagnostic');
console.log('========================================\n');
console.log(`✅ MONGODB_URI found in .env.local`);
console.log(`   Protocol : ${isSRV ? 'mongodb+srv (SRV)' : 'mongodb (standard)'}`);
console.log(`   Hostname  : ${hostname}`);
console.log(`   Database  : ${dbName}`);
console.log(`   Port      : ${parsedUri.port || (isSRV ? '(SRV auto)' : '27017')}`);
console.log('');

// Step 1: Test basic hostname resolution
console.log('--- Step 1: Hostname DNS A/AAAA Resolution ---');
await new Promise((resolve) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) {
            console.log(`❌ dns.lookup("${hostname}") FAILED`);
            console.log(`   Error: ${err.code} - ${err.message}`);
        } else {
            console.log(`✅ dns.lookup("${hostname}") SUCCEEDED`);
            addresses.forEach(a => console.log(`   → ${a.address} (IPv${a.family})`));
        }
        resolve();
    });
});

// Step 2: Test SRV record resolution
if (isSRV) {
    console.log('\n--- Step 2: SRV Record Resolution ---');
    const srvName = `_mongodb._tcp.${hostname}`;
    console.log(`   Querying: ${srvName}`);
    await new Promise((resolve) => {
        dns.resolveSrv(srvName, (err, addresses) => {
            if (err) {
                console.log(`❌ dns.resolveSrv("${srvName}") FAILED`);
                console.log(`   Error Code : ${err.code}`);
                console.log(`   Error Msg  : ${err.message}`);
                if (err.code === 'ECONNREFUSED') {
                    console.log('');
                    console.log('   ⚠️  ECONNREFUSED on SRV lookup means:');
                    console.log('   → Your DNS server is REFUSING SRV queries');
                    console.log('   → This is likely a local DNS/router restriction');
                    console.log('   → Or a VPN/firewall blocking UDP port 53 SRV queries');
                } else if (err.code === 'ENOTFOUND') {
                    console.log('');
                    console.log('   ⚠️  ENOTFOUND means:');
                    console.log('   → Hostname does not exist in DNS at all');
                    console.log('   → Check if the hostname in .env.local is correct');
                } else if (err.code === 'ETIMEOUT') {
                    console.log('');
                    console.log('   ⚠️  ETIMEOUT means:');
                    console.log('   → DNS query timed out - network issue or blocked');
                }
            } else {
                console.log(`✅ SRV records found:`);
                addresses.forEach(a => {
                    console.log(`   → ${a.name}:${a.port} (priority: ${a.priority}, weight: ${a.weight})`);
                });
            }
            resolve();
        });
    });
}

// Step 3: Test with different DNS servers
console.log('\n--- Step 3: Try with Google DNS (8.8.8.8) ---');
const dnsGoogle = new dns.Resolver();
dnsGoogle.setServers(['8.8.8.8', '8.8.4.4']);
if (isSRV) {
    const srvName = `_mongodb._tcp.${hostname}`;
    await new Promise((resolve) => {
        dnsGoogle.resolveSrv(srvName, (err, addresses) => {
            if (err) {
                console.log(`❌ Google DNS SRV lookup FAILED: ${err.code} - ${err.message}`);
            } else {
                console.log(`✅ Google DNS SRV lookup SUCCEEDED!`);
                addresses.forEach(a => {
                    console.log(`   → ${a.name}:${a.port}`);
                });
                console.log('');
                console.log('   ✅ This means: MongoDB Atlas DNS is fine,');
                console.log('      but your DEFAULT DNS server is the problem!');
                console.log('      Solution: Change DNS to 8.8.8.8 or use fallback URI');
            }
            resolve();
        });
    });

    // Step 4: Txt record (alternative connection check)
    console.log('\n--- Step 4: TXT Record for mongodb+srv ---');
    await new Promise((resolve) => {
        dnsGoogle.resolveTxt(hostname, (err, records) => {
            if (err) {
                console.log(`   TXT lookup: ${err.code}`);
            } else {
                console.log(`✅ TXT records found:`);
                records.forEach(r => console.log(`   → ${r.join('')}`));
            }
            resolve();
        });
    });
}

console.log('\n========================================');
console.log('  Summary & Recommendations');
console.log('========================================');
console.log('');
console.log('If Step 2 FAILED but Step 3 SUCCEEDED:');
console.log('  → Root Cause: Your local DNS server blocks SRV queries');
console.log('  → Fix Option A: Change Windows DNS to 8.8.8.8 (Google)');
console.log('  → Fix Option B: Get the Direct URI from MongoDB Atlas');
console.log('    (Clusters > Connect > Drivers > Select "Standard (no SRV)")');
console.log('');
console.log('If BOTH Step 2 AND 3 FAILED:');
console.log('  → Root Cause: MongoDB Atlas hostname does not exist / wrong hostname');
console.log('  → Fix: Check MongoDB Atlas > Clusters > Connect > correct hostname');
console.log('');
console.log('If Step 1 FAILED:');
console.log('  → Root Cause: hostname cannot be resolved at all (wrong URI or no internet)');
console.log('');
