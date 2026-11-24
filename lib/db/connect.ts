import mongoose from 'mongoose';
import dns from 'dns';

// ─── Environment Check ────────────────────────────────────────────────────────
function getMongoUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error(
            '[MongoDB] MONGODB_URI is not configured.\n' +
            'Please add MONGODB_URI to your environment variables.\n' +
            'Format: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE'
        );
    }
    return uri;
}

// ─── DNS Fix: Force IPv4 + prefer system DNS then Google DNS ─────────────────
// This fixes ECONNREFUSED on SRV lookups caused by local DNS/router restrictions.
// Node.js by default may use IPv6 or a DNS resolver that blocks SRV records.
dns.setDefaultResultOrder('ipv4first');

// ─── Connection Cache (prevents multiple connections on hot-reload & serverless) ─
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__mongooseCache ?? { conn: null, promise: null };

if (!globalThis.__mongooseCache) {
    globalThis.__mongooseCache = cached;
}

// ─── Connection Options (tuned for Vercel Serverless + MongoDB Atlas M0) ─────
const MONGOOSE_OPTS: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 3,                     // Keep pool small per serverless instance for Atlas M0 (500 conn limit)
    minPoolSize: 0,                     // Allow pool to scale to 0 when instance is idle
    maxIdleTimeMS: 10000,               // Close idle sockets after 10s while lambda is warm/frozen
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
    // Return existing healthy connection (readyState: 1 = connected)
    if (cached.conn) {
        const state = cached.conn.connection.readyState;
        if (state === 1) {
            return cached.conn;
        }
        // If still connecting and a promise is in flight, wait for it below
        if (state !== 2 || !cached.promise) {
            // Connection dropped or disconnecting – reset cache and reconnect
            console.warn('[MongoDB] Existing connection is stale (state=' + state + '). Reconnecting...');
            cached.conn = null;
            cached.promise = null;
        }
    }

    // Reuse an already-open default Mongoose connection if cache was cleared
    if (!cached.conn && mongoose.connection.readyState === 1) {
        cached.conn = mongoose;
        return cached.conn;
    }

    if (!cached.promise) {
        const uri = getMongoUri();
        cached.promise = mongoose.connect(uri, MONGOOSE_OPTS);
    }

    try {
        cached.conn = await cached.promise;
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
