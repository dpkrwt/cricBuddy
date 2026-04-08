import { defineTokens } from "@chakra-ui/react";

export const colors = defineTokens.colors({
  brand: {
    50: { value: "#e8f5f0" },
    100: { value: "#c5e6d8" },
    200: { value: "#9ed5be" },
    300: { value: "#74c4a4" },
    400: { value: "#55b791" },
    500: { value: "#36aa7e" },
    600: { value: "#2f9b73" },
    700: { value: "#268965" },
    800: { value: "#1e7858" },
    900: { value: "#0f593e" },
  },
  accent: {
    50: { value: "#e0f7fa" },
    100: { value: "#b2ebf2" },
    200: { value: "#80deea" },
    300: { value: "#4dd0e1" },
    400: { value: "#26c6da" },
    500: { value: "#00bcd4" },
    600: { value: "#00acc1" },
    700: { value: "#0097a7" },
    800: { value: "#00838f" },
    900: { value: "#006064" },
  },
  surface: {
    dark: { value: "#0f1923" },
    darkCard: { value: "#162231" },
    darkCardHover: { value: "#1e3044" },
    darkBorder: { value: "rgba(255, 255, 255, 0.08)" },
    light: { value: "#f5f7fa" },
    lightCard: { value: "#ffffff" },
    lightCardHover: { value: "#f0f2f5" },
    lightBorder: { value: "#e2e8f0" },
  },
  live: {
    DEFAULT: { value: "#ef4444" },
    glow: { value: "#fecaca" },
  },
  gold: {
    DEFAULT: { value: "#f59e0b" },
  },
});
