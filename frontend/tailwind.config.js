/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#fdf8f0",
          100: "#f9edda",
          200: "#f2d9b0",
          300: "#e8c07e",
          400: "#dda04e",
          500: "#d4872e",
        },
        ocean: {
          600: "#0e7490",
          700: "#0c6478",
          800: "#0a5060",
          900: "#083d4a",
        },
      },
    },
  },
  plugins: [],
};
