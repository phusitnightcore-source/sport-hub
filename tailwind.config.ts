import type { Config } from 'tailwindcss'

/**
 * SportHub Tailwind Config (v2 — Soft Blue Dashboard)
 * ทุกสี/radius/shadow ต้องดึงจากที่นี่ ห้าม inline hex ใน component
 * ค่าตรงนี้ต้องตรงกับ docs/DESIGN_SYSTEM.md เป๊ะ — แก้ที่เดียวทั้งสองไฟล์พร้อมกัน
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand:        'rgb(var(--brand) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-soft': 'rgb(var(--brand-soft) / <alpha-value>)',
        surface:      'rgb(var(--surface) / <alpha-value>)',
        ink:          'rgb(var(--ink) / <alpha-value>)',
        'ink-soft':   'rgb(var(--ink-soft) / <alpha-value>)',
        line:         'rgb(var(--line) / <alpha-value>)',
        success:      'rgb(var(--success) / <alpha-value>)',
        danger:       'rgb(var(--danger) / <alpha-value>)',
        warning:      'rgb(var(--warning) / <alpha-value>)',
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(180deg, rgb(var(--bg-top)) 0%, rgb(var(--bg-bottom)) 100%)',
      },
      fontFamily: {
        display: ['var(--font-prompt)', 'sans-serif'],
        body: ['var(--font-prompt)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15' }],
        'display-md': ['1.5rem', { lineHeight: '1.2' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'mono-sm': ['0.8125rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
    },
  },
  plugins: [],
}

export default config
