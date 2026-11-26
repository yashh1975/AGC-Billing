/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C49A35',
          dark: '#A98226',
          light: '#F8F2E4',
        },
        border: '#E7E2D7',
        background: '#FFFFFF',
        foreground: '#1A1A1A',
        muted: {
          DEFAULT: '#F5F1EA',
          foreground: '#6B6355',
        },
        accent: {
          DEFAULT: '#C49A35',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        primary: {
          DEFAULT: '#C49A35',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F1EA',
          foreground: '#1A1A1A',
        },
        input: '#E7E2D7',
        ring: '#C49A35',
      },
      fontFamily: {
        serif: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
};
