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
          50: "#eef5ff",
          100: "#d9e6ff",
          200: "#b3ceff",
          300: "#84afff",
          400: "#4a86ff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e3a8a",
          800: "#1e3369",
          900: "#172554",
        },
      },
      borderRadius: {
        card: "1rem",
      },
    },
  },
  plugins: [],
};
