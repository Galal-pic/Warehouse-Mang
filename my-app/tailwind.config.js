/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#001473",
        second: "#1976d2",
        third: "#00bcd4",
      },
    },
  },
  plugins: [],
};
