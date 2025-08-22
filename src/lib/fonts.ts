// Use system fonts to avoid Turbopack compatibility issues with Google Fonts
// This ensures reliable loading across all environments

// System font configuration
export const systemFontConfig = {
  variable: "--font-system",
  className: "font-system"
};

// Monospace font configuration  
export const monoFontConfig = {
  variable: "--font-mono",
  className: "font-mono"
};

// Font class names for easy use throughout the app - using system fonts
export const fontClassNames = "antialiased";
