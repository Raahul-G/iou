/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light mode — "Morning Coffee"
        cream: {
          DEFAULT: "#FFFDF9", // Warm Cream
          dark: "#F5EDEE",
        },
        sand: "#F0DCDC",     // Soft Rose border/bg
        brown: {
          warm: "#D4A5A5",   // Muted Rose — buttons/active states
          deep: "#3D2E2E",   // Deep Cocoa — main text
          muted: "#8C7676",  // Soft Mauve — secondary text
        },
        // Dark mode — "Midnight Snuggle"
        bark: {
          DEFAULT: "#1E151E", // Midnight Fig
          card: "#2B1F2B",   // Espresso Deep
        },
        umber: "#BA8B8B",    // Dusty Rose — dark mode accent
        offwhite: "#F6F0F5", // Soft Vanilla — dark mode text
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        cozy: "20px",
        xl: "20px", // override default 12px → 20px for cards/containers
      },
    },
  },
  plugins: [],
};
