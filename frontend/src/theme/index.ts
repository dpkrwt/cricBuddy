import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { colors } from "./colors";
import { semanticTokens } from "./semantic-tokens";

const config = defineConfig({
  globalCss: {
    body: {
      bg: "bg.page",
      color: "text.primary",
    },
    "::-webkit-scrollbar": {
      width: "8px",
    },
    "::-webkit-scrollbar-track": {
      bg: "bg.page",
    },
    "::-webkit-scrollbar-thumb": {
      bg: "bg.card.hover",
      borderRadius: "4px",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Inter', sans-serif" },
        body: { value: "'Inter', sans-serif" },
      },
      colors,
    },
    semanticTokens,
  },
});

export const system = createSystem(defaultConfig, config);
