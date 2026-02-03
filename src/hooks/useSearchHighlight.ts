import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface HighlightConfig {
  id: string | null;
  type: string | null;
  searchTerm: string | null;
}

export const useSearchHighlight = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightConfig, setHighlightConfig] = useState<HighlightConfig>({
    id: null,
    type: null,
    searchTerm: null
  });

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const highlightType = searchParams.get('type');
    const searchTerm = searchParams.get('search');

    if (highlightId || searchTerm) {
      setHighlightConfig({
        id: highlightId,
        type: highlightType,
        searchTerm: searchTerm
      });

      // Auto-clear highlight after 8 seconds
      const timer = setTimeout(() => {
        clearHighlight();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const clearHighlight = useCallback(() => {
    setHighlightConfig({ id: null, type: null, searchTerm: null });
    // Remove highlight params from URL without navigation
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('highlight');
    newParams.delete('type');
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const isHighlighted = useCallback((recordId: string) => {
    return highlightConfig.id === recordId;
  }, [highlightConfig.id]);

  const matchesSearch = useCallback((text: string) => {
    if (!highlightConfig.searchTerm) return false;
    return text.toLowerCase().includes(highlightConfig.searchTerm.toLowerCase());
  }, [highlightConfig.searchTerm]);

  const scrollToHighlighted = useCallback((elementId: string) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add pulse animation
        element.classList.add('animate-highlight-pulse');
        setTimeout(() => {
          element.classList.remove('animate-highlight-pulse');
        }, 3000);
      }
    }, 300);
  }, []);

  return {
    highlightConfig,
    isHighlighted,
    matchesSearch,
    clearHighlight,
    scrollToHighlighted
  };
};

// Helper to build navigation URL with highlight
export const buildHighlightUrl = (
  basePath: string,
  recordId: string,
  type: string,
  searchTerm?: string
): string => {
  const params = new URLSearchParams();
  params.set('highlight', recordId);
  params.set('type', type);
  if (searchTerm) {
    params.set('search', searchTerm);
  }
  return `${basePath}?${params.toString()}`;
};
