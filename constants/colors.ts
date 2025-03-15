export const colors = {
  primary: {
    1: "#C549FB", // Primary-1 aus dem Design
    2: "#F7E8FF", // Primary-2 aus dem Design
  },
  attention: "#EF5D60", // Attention aus dem Design
  black: {
    1: "#011A38", // Black-1 aus dem Design (dunkelblau)
    2: "#2E294E", // Black-2 aus dem Design
    3: "#8C8E98", // Black-3 aus dem Design (grau)
  },
  white: "#FFFFFF",
  background: "#011A38", // Haupthintergrundfarbe der App
} as const;

// Tailwind-spezifische Farbkonfiguration
export const tailwindColors = {
  "primary-1": "#C549FB",
  "primary-2": "#F7E8FF",
  attention: "#EF5D60",
  "black-1": "#011A38",
  "black-2": "#2E294E",
  "black-3": "#8C8E98",
};
