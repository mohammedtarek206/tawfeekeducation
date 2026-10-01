/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // NEW PREMIUM PALETTE
                forest: {
                    DEFAULT: '#123C32',
                    light: '#1a5244',
                    dark: '#0c2820',
                },
                earth: {
                    DEFAULT: '#D8C3A5',
                    light: '#EAD9C2',
                    dark: '#C4A882',
                },
                gold: {
                    DEFAULT: '#C9A227',
                    light: '#D9B84A',
                    dark: '#A8841E',
                },
                geo: {
                    DEFAULT: '#356B7A',
                    light: '#4A8A9B',
                    dark: '#264F5C',
                },
                offwhite: '#F7F4ED',
                darktext: '#1D2925',
                muted: '#7A8C85',

                // Keep legacy tawfeek colors for compatibility with admin/student pages
                tawfeek: {
                    primary: '#123C32',
                    'primary-light': '#1a5244',
                    accent: '#C9A227',
                    bg: '#F7F4ED',
                    surface: '#FFFFFF',
                    text: '#1D2925',
                    'text-light': '#6B7B76',
                    border: '#E2DDD5',
                    error: '#D9534F',
                    green: '#123C32',
                    'green-light': '#1a5244',
                    'green-mid': '#356B7A',
                    'green-soft': '#4A8A9B',
                    'green-pale': 'rgba(18, 60, 50, 0.08)',
                    gold: '#C9A227',
                    'gold-light': '#D9B84A',
                    dark: '#1D2925',
                    'dark-2': '#123C32',
                    white: '#FFFFFF',
                    'off-white': '#F7F4ED',
                    gray: '#6B7B76',
                    'gray-light': '#F7F4ED',
                },
            },
            fontFamily: {
                arabic: ['Cairo', 'Tajawal', 'sans-serif'],
                sans: ['Cairo', 'Tajawal', 'sans-serif'],
            },
            borderRadius: {
                xl: '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                card: '0 2px 20px -4px rgba(18,60,50,0.10), 0 8px 16px -4px rgba(18,60,50,0.06)',
                forest: '0 8px 32px -4px rgba(18,60,50,0.30)',
                gold: '0 8px 32px -4px rgba(201,162,39,0.35)',
                geo: '0 8px 32px -4px rgba(53,107,122,0.30)',
                glass: '0 8px 32px 0 rgba(18,60,50,0.12)',
            },
            backgroundImage: {
                'contour-pattern': "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 Q70 30 90 50 Q70 70 50 90 Q30 70 10 50 Q30 30 50 10Z' fill='none' stroke='%23123C32' stroke-width='0.5' opacity='0.08'/%3E%3C/svg%3E\")",
                'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%23123C32' stroke-width='0.4' opacity='0.07'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E\")",
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'fade-in-up': 'fadeInUp 0.6s ease-out',
                'slide-in-right': 'slideInRight 0.5s ease-out',
                'float': 'float 6s ease-in-out infinite',
                'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
                'rotate-slow': 'rotateSlow 30s linear infinite',
                'count-up': 'countUp 0.5s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(-24px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                rotateSlow: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                countUp: {
                    '0%': { opacity: '0', transform: 'scale(0.8)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                }
            },
        },
    },
    plugins: [],
};
