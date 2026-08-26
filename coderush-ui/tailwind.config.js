/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // urgency scale — used consistently across RequestFeed, DecisionLog, map markers
        urgent: '#dc2626',
        elevated: '#ea580c',
        routine: '#2563eb',
        idle: '#16a34a',
      },
    },
  },
  plugins: [],
}
