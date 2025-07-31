import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-contrast travel-themed color palette for maximum visibility
        primary: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#64748b',
          600: '#1e40af',
          700: '#1e3a8a',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          DEFAULT: '#1e40af',
          foreground: '#ffffff',
        },
        secondary: {
          50: '#ffffff',
          100: '#f0f9ff',
          200: '#e0f2fe',
          300: '#bae6fd',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0369a1',
          700: '#0c4a6e',
          800: '#164e63',
          900: '#083344',
          950: '#0c1317',
          DEFAULT: '#0369a1',
          foreground: '#ffffff',
        },
        accent: {
          50: '#ffffff',
          100: '#fef7ee',
          200: '#fdedd3',
          300: '#fbd6a5',
          400: '#f59332',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
          DEFAULT: '#dc2626',
          foreground: '#ffffff',
        },
        neutral: {
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#e5e5e5',
          400: '#a3a3a3',
          500: '#6b7280',
          600: '#374151',
          700: '#1f2937',
          800: '#111827',
          900: '#000000',
          950: '#000000',
          DEFAULT: '#374151',
        },
        // New high-contrast color utilities
        text: {
          primary: '#000000',
          secondary: '#1f2937',
          muted: '#374151',
          inverse: '#ffffff',
        },
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          accent: '#f3f4f6',
          dark: '#1f2937',
        }
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'travel-hero': 'linear-gradient(135deg, #475569 0%, #0284c7 100%)',
        'travel-card': 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
        'itinerary-bg': 'linear-gradient(120deg, #f0f9ff 0%, #fef7ee 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-gentle': 'bounceGentle 3s infinite ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-10px) translateX(10px)' },
          '66%': { transform: 'translateY(10px) translateX(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
