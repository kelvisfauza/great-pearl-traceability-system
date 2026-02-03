import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearch, SearchResult } from './useGlobalSearch';

export interface AISearchResult extends SearchResult {
  relevance?: number;
}

export interface AISearchSuggestion {
  text: string;
  action: string;
}

export interface AISearchResponse {
  results: AISearchResult[];
  suggestions: AISearchSuggestion[];
  fallback?: boolean;
  error?: string;
}

export const useAISearch = (searchTerm: string, debounceMs: number = 400) => {
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AISearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const { employee } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Fallback to standard search
  const { results: fallbackResults, loading: fallbackLoading } = useGlobalSearch(searchTerm);

  const performAISearch = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !employee) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            query,
            userEmail: employee.email,
            userPermissions: employee.permissions || [],
            userDepartment: employee.department,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: AISearchResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error as string);
      }

      setResults(data.results || []);
      setSuggestions(data.suggestions || []);
      setUsingFallback(data.fallback || false);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error('AI Search error:', err);
      setError(err.message);
      // Use fallback results
      setResults(fallbackResults.map(r => ({ ...r, relevance: 50 })));
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [employee, fallbackResults]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performAISearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs, performAISearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    suggestions,
    loading: loading || fallbackLoading,
    error,
    usingFallback,
  };
};
