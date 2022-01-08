const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rr: colors.slate,
      },
      keyframes: {
        "border-wiggle": {
          "0%, 100%": { "border-width": "1px" },
          "50%": { "border-width": "30px" },
        },
      },
      animation: {
        "border-wiggle": "border-wiggle 2s ease-in-out infinite",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
