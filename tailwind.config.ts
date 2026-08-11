/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

// Tailwind config for Void Motion (M02).
//
// Design tokens mirror the frozen legacy Inkplainer reference app
// (legacy/index.html lines 20-34): a light, near-monochrome palette with a
// near-black accent. shadcn/ui CSS variables are layered on top in
// `src/app/globals.css` and consumed here via `hsl(var(--…))` so theme
// swapping remains a single-source-of-truth CSS change.
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens — bound to CSS variables in globals.css.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Direct legacy token aliases for one-off structural color matching.
        panel: 'hsl(var(--panel))',
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
        },
        sidebar: 'hsl(var(--sidebar))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Legacy logo / handwriting accent font (legacy/index.html line 79).
        hand: ['Caveat', 'cursive'],
      },
      fontSize: {
        // Legacy editor top bar height (legacy/index.html line 34: --header-h: 52px).
        'header-h': ['52px', { lineHeight: '52px' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}
