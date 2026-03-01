import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeName } from "../../lib/themes";

const STORAGE_KEY = "app_theme";

interface ThemeState {
  name: ThemeName;
}

const initialState: ThemeState = { name: "dark" };

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      state.name = action.payload;
      AsyncStorage.setItem(STORAGE_KEY, action.payload).catch(() => {});
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;

/** Call once at app start to rehydrate saved theme preference. */
export async function loadSavedTheme(): Promise<ThemeName> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "orange") return saved;
  } catch {}
  return "dark";
}
