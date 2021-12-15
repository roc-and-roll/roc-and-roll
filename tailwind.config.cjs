const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: [
    './src/client/**/*.ts',
    './src/client/**/*.tsx',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        rr: colors.blueGray
      },
      keyframes: {
        'border-wiggle': {
          '0%, 100%': { 'border-width': '1px' },
          '50%': { 'border-width': '30px' },
        }
      },
      animation: {
        'border-wiggle': 'border-wiggle 2s ease-in-out infinite'
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
