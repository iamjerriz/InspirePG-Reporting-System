import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-theme";

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return false;
  if (stored === "dark") return true;
  return true; // Dark mode is the default for the admin dashboard.
}

export function useAdminTheme() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  return { isDark, toggleTheme };
}
