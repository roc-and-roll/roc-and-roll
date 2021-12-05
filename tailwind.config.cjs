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
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
