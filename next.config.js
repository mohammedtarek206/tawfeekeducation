/** @type {import('next').NextConfig} */

// Force IPv4 DNS resolution to fix ECONNREFUSED on MongoDB SRV lookups.
// Windows DNS resolvers sometimes refuse SRV queries over IPv6.
// This must be set before the Next.js server starts.
if (typeof process !== 'undefined') {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '')
        .replace(/--dns-result-order=\S+/g, '')
        .trim() + ' --dns-result-order=ipv4first';
}

const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['lh3.googleusercontent.com', 'i.ytimg.com', 'img.youtube.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.ytimg.com',
            },
        ],
    },
    // Increase body size limit for the upload API route (Base64 images)
    experimental: {
        serverActions: {
            bodySizeLimit: '8mb',
        },
    },
    async headers() {

        // Shared security headers
        const securityHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
        ];

        // Shared noindex header
        const noIndexHeader = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

        // Private routes that shouldn't be indexed
        const privateRoutes = [
            '/api/:path*',
            '/admin/:path*',
            '/student/:path*',
            '/parent/:path*',
            '/login',
            '/register',
            '/verify-otp',
            '/pending',
            '/subscription/:path*'
        ];

        return [
            ...privateRoutes.map(path => ({
                source: path,
                headers: [...securityHeaders, noIndexHeader]
            }))
        ];
    },
};

module.exports = nextConfig;
