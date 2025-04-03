/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      colors: {
        'bu-blue': '#003366', // Primary BU Navy Blue
        'bu-gold': '#FDB813', // Primary BU Gold/Yellow
        // We can still use default Tailwind colors like gray, white, red, etc.
      },
      // Add font families here later if needed
    },
  },
  plugins: [],
}; 