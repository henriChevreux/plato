/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:             'var(--color-bg)',
        surface:        'var(--color-surface)',
        border:         'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        text:           'var(--color-text)',
        muted:          'var(--color-muted)',
        subtle:         'var(--color-subtle)',
        accent:         '#c9a84c',
        'accent-dim':   '#a07830',
        error:          '#c94c4c',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
