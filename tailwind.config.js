/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      flex: {
        2: '2',
        3: '3',
      },
    },
  },
  plugins: [],
};
