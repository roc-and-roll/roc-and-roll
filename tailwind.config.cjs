const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rr: colors.slate,
        rrOrange: "#ff9900",
        rrOrangeLighter: "#ffbb22",
      },
      keyframes: {
        "border-wiggle": {
          "0%, 100%": { "border-width": "1px" },
          "50%": { "border-width": "30px" },
        },
        "border-color": {
          "0%, 100%": { "border-color": "gold" },
          "50%": { "border-color": "orangered" },
        },
      },
      animation: {
        "border-wiggle": "border-wiggle 2s ease-in-out infinite",
        "border-color": "border-color 4s ease-in-out infinite",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
