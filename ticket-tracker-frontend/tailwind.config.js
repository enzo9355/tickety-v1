/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "on-tertiary": "#ffffff",
        "on-surface": "#181c20",
        "on-secondary-fixed-variant": "#6e3900",
        "surface-container-high": "#e5e8ee",
        "error": "#ba1a1a",
        "surface-container-low": "#f1f4f9",
        "error-container": "#ffdad6",
        "inverse-primary": "#ffb59a",
        "surface": "#f7f9ff",
        "secondary-container": "#fd8b00",
        "primary-fixed-dim": "#ffb59a",
        "on-tertiary-fixed": "#002113",
        "surface-dim": "#d7dadf",
        "on-primary": "#ffffff",
        "on-tertiary-fixed-variant": "#005236",
        "outline": "#907065",
        "background": "#F8F9FA", // Changed from generated code to #F8F9FA as instructed
        "secondary-fixed-dim": "#ffb77d",
        "on-tertiary-container": "#003320",
        "surface-bright": "#f7f9ff",
        "tertiary-container": "#00a773",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#e0e3e8",
        "primary": "#FF5B00", // Modified for brand color
        "on-error-container": "#93000a",
        "secondary": "#FF8C00", // Modified for brand secondary
        "outline-variant": "#e4beb1",
        "inverse-on-surface": "#eef1f6",
        "surface-variant": "#e0e3e8",
        "on-secondary-fixed": "#2f1500",
        "on-primary-container": "#ffffff", // Make primary container text white usually
        "primary-fixed": "#ffdbce",
        "on-error": "#ffffff",
        "tertiary": "#006c49",
        "secondary-fixed": "#ffdcc3",
        "primary-container": "#FF5B00",
        "surface-tint": "#a83900",
        "on-primary-fixed-variant": "#802a00",
        "tertiary-fixed": "#6ffbbe",
        "inverse-surface": "#2d3135",
        "on-secondary": "#ffffff",
        "tertiary-fixed-dim": "#4edea3",
        "surface-container": "#ebeef3",
        "on-background": "#212529", // Modified for brand text
        "on-secondary-container": "#603100",
        "on-primary-fixed": "#380d00",
        "on-surface-variant": "#5A626A" // Modified for muted text
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "gutter": "20px",
        "unit": "4px",
        "container-max": "1280px",
        "sm": "8px",
        "xl": "32px",
        "xxl": "48px",
        "md": "16px",
        "xs": "4px",
        "lg": "24px"
      },
      "fontFamily": {
        "headline-lg": ["Outfit", "sans-serif"],
        "headline-md": ["Outfit", "sans-serif"],
        "headline-lg-mobile": ["Outfit", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "display-lg": ["Outfit", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "headline-sm": ["Outfit", "sans-serif"]
      },
      "fontSize": {
        "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-md": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "body-sm": ["14px", { "lineHeight": "1.5", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "1.2", "fontWeight": "500" }],
        "display-lg": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-md": ["14px", { "lineHeight": "1.2", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "headline-sm": ["20px", { "lineHeight": "1.4", "fontWeight": "600" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
}
