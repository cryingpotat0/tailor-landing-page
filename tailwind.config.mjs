/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
    content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                gray: colors.neutral,
                primary: '#CD5334', // red
                secondary: '#2E282A', // black
                teal: '17BEBB', // teal
                buff: '#EDB88B', // buff
                rose: '#FAD8D6', // rose
            },
            fontFamily: {
                sans: ["InterVariable", "Inter", ...defaultTheme.fontFamily.sans],
            },
            aspectRatio: {
                "4/3": "4 / 3",
                "3/2": "3 / 2",
                "2/3": "2 / 3",
                "9/16": "9 / 16",
            },
        },
    },
    plugins: [
        require("@tailwindcss/line-clamp"),
        require("@tailwindcss/typography"),
    ],
};
