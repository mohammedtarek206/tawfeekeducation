/**
 * DevCredit — A slim developer credit bar shown at the very bottom of all platform layouts.
 * Appears across Admin, Student, and Parent portals.
 */
export default function DevCredit() {
    return (
        <div
            className="w-full border-t border-white/5 bg-gray-900/30 py-2 px-4 text-center flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-500 select-none"
            dir="ltr"
        >
            <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            <span>Designed &amp; Developed by</span>
            <span className="font-bold text-gray-400">Mohammed Tarek</span>
            <span className="text-gray-700 mx-0.5">·</span>
            <a
                href="tel:01284621015"
                className="text-gray-500 hover:text-gray-300 transition-colors font-mono"
                aria-label="Contact developer"
            >
                01284621015
            </a>
        </div>
    );
}
