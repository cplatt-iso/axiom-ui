/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // Add this if you followed shadcn/ui setup for dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Add these lines if recommended by shadcn/ui for your setup:
    // './pages/**/*.{ts,tsx}',
    // './components/**/*.{ts,tsx}',
    // './app/**/*.{ts,tsx}',
  ],
  prefix: "", // Add prefix if needed
  theme: {
    container: { // Add container if needed by shadcn/ui
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
       // Keyframes and animation extensions are usually added by shadcn init/add
       // If they are missing after adding components, you might need to add them manually from shadcn docs
       // Example:
       // keyframes: {
       //   "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" }, },
       //   "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" }, },
       // },
       // animation: {
       //   "accordion-down": "accordion-down 0.2s ease-out",
       //   "accordion-up": "accordion-up 0.2s ease-out",
       // },
    },
  },
  plugins: [require("tailwindcss-animate")], // <-- ADD THIS PLUGIN
}
