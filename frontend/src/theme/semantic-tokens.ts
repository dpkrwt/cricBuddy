import { defineSemanticTokens } from "@chakra-ui/react";

export const semanticTokens = defineSemanticTokens({
  colors: {
    "bg.page": {
      value: { base: "{colors.surface.light}", _dark: "{colors.surface.dark}" },
    },
    "bg.card": {
      value: {
        base: "{colors.surface.lightCard}",
        _dark: "{colors.surface.darkCard}",
      },
    },
    "bg.card.hover": {
      value: {
        base: "{colors.surface.lightCardHover}",
        _dark: "{colors.surface.darkCardHover}",
      },
    },
    "bg.subtle": {
      value: { base: "{colors.gray.50}", _dark: "rgba(255, 255, 255, 0.04)" },
    },
    "border.default": {
      value: {
        base: "{colors.surface.lightBorder}",
        _dark: "{colors.surface.darkBorder}",
      },
    },
    "text.primary": {
      value: { base: "{colors.gray.900}", _dark: "{colors.white}" },
    },
    "text.secondary": {
      value: { base: "{colors.gray.600}", _dark: "rgba(255, 255, 255, 0.6)" },
    },
    "text.muted": {
      value: { base: "{colors.gray.400}", _dark: "rgba(255, 255, 255, 0.36)" },
    },
    "accent.solid": {
      value: { base: "{colors.accent.600}", _dark: "{colors.accent.400}" },
    },
    "accent.fg": {
      value: "{colors.accent.500}",
    },
    "nav.bg": {
      value: {
        base: "linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)",
        _dark: "linear-gradient(135deg, #0d1520 0%, #162231 100%)",
      },
    },
  },
});
