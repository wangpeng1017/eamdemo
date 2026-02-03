import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 慧新全智品牌色
      colors: {
        primary: {
          DEFAULT: '#00405C',
          light: '#005578',
          dark: '#002D40',
        },
        secondary: {
          green: '#A5D867',
          cyan: '#0097BA',
        },
        // 功能色
        success: '#2BA471',
        error: '#D54941',
        warning: '#E37318',
        info: '#0097BA',
        // 中性色
        gray: {
          50: '#F0F2F5',
          100: '#E3E7EE',
          200: '#DBDFE7',
          300: '#999999',
          400: '#707074',
          500: '#666666',
          600: '#404044',
          700: '#333333',
          800: '#0555C5',
          900: '#4B0B5CB',
        },
      },
      // 字体家族
      fontFamily: {
        sans: [
          'HarmonyOS Sans',
          'D-DIN-PRO',
          'Source Han Sans CN',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Arial',
          'sans-serif',
        ],
      },
      // 字号
      fontSize: {
        'h1': ['36px', { lineHeight: '54px', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '36px', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '30px', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '27px', fontWeight: '500' }],
        'h5': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'body': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'small': ['12px', { lineHeight: '18px', fontWeight: '400' }],
      },
      // 字重
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      // 间距系统 (4px基础)
      spacing: {
        '0': '0px',
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      // 圆角
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      // 阴影
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
