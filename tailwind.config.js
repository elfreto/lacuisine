/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  darkMode: [
    'variant',
    ['@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) & }', ':root[data-theme="dark"] &'],
  ],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        'accent-soft': token('accent-soft'),
        tomato: token('tomato'),
        peach: token('peach'),
        header: token('header'),
        'header-ink': token('header-ink'),
        'header-muted': token('header-muted'),
        cream: token('cream'),
        sage: token('sage'),
        'sage-ink': token('sage-ink'),
        sun: token('sun'),
        'sun-ink': token('sun-ink'),
        salmon: token('salmon'),
        'salmon-ink': token('salmon-ink'),
        orange: token('orange'),
        'orange-ink': token('orange-ink'),
        red: token('red'),
        'red-ink': token('red-ink'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
