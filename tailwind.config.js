/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light mode
        cream: {
          DEFAULT: "#FFF8F3",
          dark: "#F5EDE4",
        },
        sand: "#FFE8D1",
        brown: {
          warm: "#D4A574",
          deep: "#5A4A42",
          muted: "#8A7A74",
        },
        // Dark mode
        bark: {
          DEFAULT: "#1A1410",
          card: "#2A1F18",
        },
        umber: "#B8885C",
        offwhite: "#E8DDD5",
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        cozy: "8px",
      },
    },
  },
  plugins: [],
};
