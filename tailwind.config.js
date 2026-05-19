/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── StrataDesk Design System ─────────────────────────────────────────
        // Deep navy base (geotechnical blue palette)
        void:        "#000814",   // deepest background
        "deep-void": "#001233",   // sidebar / panel backgrounds
        surface:     "#023E8A",   // card borders, elevated surfaces (blue-tinted)
        "surface-2": "#0077B6",   // secondary surface / hover states
        overlay:     "#03045E",   // modal overlays

        // Primary accent — geological gold
        gold:    "#D4AF37",   // primary CTA, active states
        "gold-2":"#FFD700",   // hover on primary
        "gold-3":"#FFCC00",   // highlights
        "gold-4":"#FFC627",   // warm accent

        // Blue accent scale (structural UI)
        navy:    "#03045E",   // deepest navy
        "navy-2":"#000066",   // dark navy
        ocean:   "#0077B6",   // mid blue — buttons, icons
        sky:     "#00B4D8",   // light blue — secondary accents
        mist:    "#90E0EF",   // pale blue — muted text on dark
        frost:   "#CAF0F8",   // near-white blue — primary text

        // Text scale
        "text-primary":   "#CAF0F8",   // main text (frost)
        "text-secondary": "#90E0EF",   // secondary (mist)
        "text-muted":     "#0077B6",   // muted (ocean)

        // Legacy aliases kept for backward compat during transition
        core:    "#D4AF37",
        shoal:   "#FFD700",
        reef:    "#FFCC00",
        shallows:"#90E0EF",
        tide:    "#CAF0F8",
        foam:    "#CAF0F8",
        teal:    "#0077B6",
        "teal-light": "#00B4D8",
        "deep-ocean": "#001233",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'navy-sm':  '0 2px 8px rgba(0, 18, 51, 0.6)',
        'navy-md':  '0 4px 24px rgba(0, 18, 51, 0.8)',
        'navy-lg':  '0 8px 48px rgba(0, 18, 51, 0.9)',
        'gold-glow':'0 0 20px rgba(212, 175, 55, 0.25)',
        'blue-glow':'0 0 20px rgba(0, 180, 216, 0.2)',
        glass:      '0 8px 32px rgba(0, 8, 20, 0.7)',
        'glass-lg': '0 16px 48px rgba(0, 8, 20, 0.85)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "pulse-gold": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
