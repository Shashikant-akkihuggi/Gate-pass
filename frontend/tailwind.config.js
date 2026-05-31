/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563EB',
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                background: '#F8FAFC',
                card: '#FFFFFF',
                text: '#0F172A',
                muted: '#64748B',
                border: '#E2E8F0',
            },
        },
    },
    plugins: [],
}
