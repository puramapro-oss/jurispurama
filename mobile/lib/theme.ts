export const theme = {
  bg: "#0A0A0F",
  card: "#13131A",
  border: "rgba(255,255,255,0.06)",
  primary: "#1E3A5F",
  gold: "#C9A84C",
  violet: "#6D28D9",
  text: "#F5F5F7",
  muted: "#9CA3AF",
  danger: "#EF4444",
  success: "#10B981",
} as const;

export type ThemeKey = keyof typeof theme;
