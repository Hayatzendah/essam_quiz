import { useState, useEffect, useCallback } from 'react';
import { levelsAPI } from '../services/levelsAPI';

const FALLBACK_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

// Module-level cache shared across all components
let cachedLevels = null;
let cachePromise = null;

async function fetchLevels() {
  if (cachedLevels) return cachedLevels;
  if (cachePromise) return cachePromise;

  cachePromise = levelsAPI.getAll()
    .then((data) => {
      cachedLevels = Array.isArray(data) ? data : [];
      cachePromise = null;
      return cachedLevels;
    })
    .catch((err) => {
      console.error('Failed to fetch levels:', err);
      cachePromise = null;
      return null;
    });

  return cachePromise;
}

export function useLevels(section) {
  const [levels, setLevels] = useState(cachedLevels || []);
  const [loading, setLoading] = useState(!cachedLevels);

  useEffect(() => {
    let cancelled = false;

    if (cachedLevels) {
      setLevels(cachedLevels);
      setLoading(false);
      return;
    }

    fetchLevels().then((data) => {
      if (!cancelled) {
        setLevels(data || []);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    cachedLevels = null;
    cachePromise = null;
    setLoading(true);
    const data = await fetchLevels();
    setLevels(data || []);
    setLoading(false);
  }, []);

  const levelsList = Array.isArray(levels) ? levels : [];
  const filteredLevels = section
    ? levelsList.filter((l) => !l.sections || l.sections.includes(section))
    : levelsList;

  const levelNames = filteredLevels.length > 0
    ? filteredLevels.map((l) => l.name)
    : FALLBACK_LEVELS;

  return { levels: filteredLevels, levelNames, loading, refresh };
}
