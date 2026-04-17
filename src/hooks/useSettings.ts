"use client";

import { useState, useEffect } from "react";
import { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/lib/prompts";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // corrupt localStorage — use defaults
    }
    setLoaded(true);
  }, []);

  function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  }

  return { settings, updateSettings, loaded };
}
