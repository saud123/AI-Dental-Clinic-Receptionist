import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#f9f9ff",
          dim: "#d3daef",
          bright: "#f9f9ff",
          lowest: "#ffffff",
          low: "#f1f3ff",
          container: "#e9edff",
          high: "#e1e8fd",
          highest: "#dce2f7",
          variant: "#dce2f7",
        },
        "on-surface": { DEFAULT: "#141b2b", variant: "#3d4947" },
        outline: { DEFAULT: "#6d7a77", variant: "#bcc9c6" },
        primary: { DEFAULT: "#00685f", fg: "#ffffff", container: "#008378", "on-container": "#f4fffc" },
        secondary: { DEFAULT: "#3b665f", fg: "#ffffff", container: "#bdece2", "on-container": "#416c65" },
        accent: { DEFAULT: "#0D9488", hover: "#0F766E", soft: "#CCFBF1", border: "#99F6E4", lightest: "#F0FDFA" },
        success: { DEFAULT: "#16A34A", soft: "#DCFCE7", border: "#86EFAC" },
        warning: { DEFAULT: "#D97706", soft: "#FEF3C7", border: "#FDE68A" },
        danger:  { DEFAULT: "#DC2626", soft: "#FEF2F2", border: "#FECACA" },
        ink:     { DEFAULT: "#111827", muted: "#6B7280", faint: "#9CA3AF" },
        border:  { DEFAULT: "#E5E7EB", soft: "#F3F4F6" },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui"],
      },
      fontSize: {
        "display": ["44px", { lineHeight: "52px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "500" }],
        "kpi": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body-md": ["15px", { lineHeight: "22px" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "caption": ["11px", { lineHeight: "14px", letterSpacing: "0.02em" }],
      },
      borderRadius: { card: "14px", btn: "10px", pill: "9999px" },
      boxShadow: {
        elev1: "0 1px 3px rgba(0,0,0,0.04)",
        elev2: "0 4px 12px rgba(13,148,136,0.05)",
        elev3: "0 12px 28px rgba(17,24,39,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
