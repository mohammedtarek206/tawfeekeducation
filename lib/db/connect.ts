import mongoose from 'mongoose';
import dns from 'dns';

// ─── Environment Check ────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        '[MongoDB] MONGODB_URI is not configured.\n' +
        'Please add MONGODB_URI to your .env.local file.\n' +
        'Format: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE'
    );
}

// ─── DNS Fix: Force IPv4 + prefer system DNS then Google DNS ─────────────────
// This fixes ECONNREFUSED on SRV lookups caused by local DNS/router restrictions.
// Node.js by default may use IPv6 or a DNS resolver that blocks SRV records.
dns.setDefaultResultOrder('ipv4first');

// ─── Connection Cache (prevents multiple connections on hot-reload) ────────────
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };

if (!global.__mongooseCache) {
    global.__mongooseCache = cached;
}

// ─── Connection Options ───────────────────────────────────────────────────────
const MONGOOSE_OPTS: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10000,   // 10s – give DNS time to resolve
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    family: 4,                          // Force IPv4 – avoids IPv6 DNS issues
};

// ─── Helper: classify connection errors ───────────────────────────────────────
function classifyMongoError(err: unknown): string {
    const msg = (err as Error)?.message ?? String(err);
    if (msg.includes('ECONNREFUSED') && msg.includes('querySrv')) {
        return 'DNS SRV resolution failed. Your local DNS server is blocking MongoDB SRV queries.\n' +
            'Fix: Change your Windows DNS to 8.8.8.8 (Google DNS) or obtain the non-SRV URI from MongoDB Atlas.';
    }
    if (msg.includes('ECONNREFUSED')) {
        return 'Connection refused. Check Network Access in MongoDB Atlas (add your IP to the whitelist).';
    }
    if (msg.includes('ENOTFOUND')) {
        return 'Hostname not found. Check that the host in MONGODB_URI matches your MongoDB Atlas cluster hostname.';
    }
    if (msg.includes('ETIMEOUT') || msg.includes('timed out')) {
        return 'Connection timed out. Check Network Access in MongoDB Atlas and your firewall settings.';
    }
    if (msg.includes('Authentication failed') || msg.includes('bad auth')) {
        return 'Authentication failed. Check the username and password in your MONGODB_URI.';
    }
    if (msg.includes('network error') || msg.includes('topology was destroyed')) {
        return 'Network error. The connection was lost. Will retry on next request.';
    }
    return msg;
}

// ─── Main connectDB function ──────────────────────────────────────────────────
async function connectDB(): Promise<typeof mongoose> {
    // Return existing healthy connection
    if (cached.conn) {
        const state = cached.conn.connection.readyState;
        // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        if (state === 1 || state === 2) {
            return cached.conn;
        }
        // Connection dropped – reset cache and reconnect
        console.warn('[MongoDB] Existing connection is stale (state=' + state + '). Reconnecting...');
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, MONGOOSE_OPTS);
    }

    try {
        cached.conn = await cached.promise;
        console.log('[MongoDB] Connected successfully');
    } catch (err: unknown) {
        cached.promise = null;
        cached.conn = null;
        const reason = classifyMongoError(err);
        console.error('[MongoDB] Connection failed:', reason);
        throw new Error('[MongoDB] Connection failed: ' + reason);
    }

    return cached.conn;
}

export default connectDB;
