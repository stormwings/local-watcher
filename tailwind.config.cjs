const path = require("path");

module.exports = {
  content: [
    "./index.html",
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5F6FA",
          100: "#EAECEF",
          200: "#D3D7E0",
          300: "#B8C0CF",
          400: "#8A94B0",
          500: "#3C4787",
          600: "#343D73",
          700: "#2E365F",
          800: "#262C4C",
          900: "#1B1F34",
        },
        surface: "#FFFFFF",
        line: "#E5E7EB",
      },
      borderRadius: {
        card: "1.2rem",
      },
      boxShadow: {
        sheet: "0 14px 34px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
