/**
 * User preferences types
 */

export type Theme = "light" | "dark" | "system";

export interface UserPreferences {
  theme?: Theme;
  selectedClient?: string;
  // Future preferences can be added here
  // language?: string;
}

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

export const PREFERENCE_KEYS = {
  THEME: "theme",
  SELECTED_CLIENT: "selectedClient",
} as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
};
