"use client";
import { useState, useEffect, useCallback } from "react";

const PINNED_STORAGE_KEY = "iedu_user_pinned_tabs";
const FREQ_STORAGE_KEY = "iedu_tab_frequency";

export function usePersonalizedNav(role: string = "student") {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedPinned = localStorage.getItem(`${PINNED_STORAGE_KEY}_${role}`);
      if (savedPinned) {
        setPinnedIds(JSON.parse(savedPinned));
      } else {
        // Default pins for students if empty
        if (role === "student") {
          setPinnedIds(["learning", "practice", "ai-tools"]);
        }
      }

      const savedFreq = localStorage.getItem(`${FREQ_STORAGE_KEY}_${role}`);
      if (savedFreq) {
        setFrequencies(JSON.parse(savedFreq));
      }
    } catch (e) {
      console.error("Failed to load personalized nav state", e);
    } finally {
      setIsLoaded(true);
    }
  }, [role]);

  // Toggle pin
  const togglePin = useCallback((tabId: string) => {
    setPinnedIds((prev) => {
      let next: string[];
      if (prev.includes(tabId)) {
        next = prev.filter((id) => id !== tabId);
      } else {
        next = [...prev, tabId];
      }
      try {
        localStorage.setItem(`${PINNED_STORAGE_KEY}_${role}`, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save pinned tabs", e);
      }
      return next;
    });
  }, [role]);

  const isPinned = useCallback((tabId: string) => {
    return pinnedIds.includes(tabId);
  }, [pinnedIds]);

  // Track visit to a tab
  const trackVisit = useCallback((tabId: string) => {
    if (!tabId || tabId === "overview") return;
    setFrequencies((prev) => {
      const next = { ...prev, [tabId]: (prev[tabId] || 0) + 1 };
      try {
        localStorage.setItem(`${FREQ_STORAGE_KEY}_${role}`, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save tab frequency", e);
      }
      return next;
    });
  }, [role]);

  // Compute top 3 suggested based on frequency
  const suggestedIds = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  return {
    pinnedIds,
    togglePin,
    isPinned,
    trackVisit,
    suggestedIds,
    isLoaded,
  };
}
