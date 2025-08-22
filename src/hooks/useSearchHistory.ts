import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdvancedSearchFilters, SearchSuggestion } from '../utils/recipeSearchUtils';
import { SecureErrorHandler } from '../utils/errorHandler';
import { ValidationUtils } from '../utils/validation';

interface SearchHistoryItem {
  id: string;
  query: string;
  filters: AdvancedSearchFilters;
  timestamp: number;
  resultsCount: number;
}

interface PopularSearch {
  query: string;
  count: number;
  lastUsed: number;
}

interface SearchStats {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsPerSearch: number;
  mostPopularCategory?: string;
  mostPopularDifficulty?: string;
}

interface UseSearchHistoryReturn {
  searchHistory: SearchHistoryItem[];
  popularSearches: PopularSearch[];
  recentQueries: string[];
  searchStats: SearchStats;
  loading: boolean;
  error: string | null;
  actions: {
    addSearch: (query: string, filters: AdvancedSearchFilters, resultsCount: number) => Promise<void>;
    removeFromHistory: (searchId: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    clearPopularSearches: () => Promise<void>;
    getSearchSuggestions: (query: string) => SearchSuggestion[];
    loadHistory: () => Promise<void>;
  };
}

const STORAGE_KEYS = {
  SEARCH_HISTORY: '@recipe_search_history',
  POPULAR_SEARCHES: '@popular_searches',
} as const;

const MAX_HISTORY_ITEMS = 50;
const MAX_POPULAR_SEARCHES = 20;
const HISTORY_RETENTION_DAYS = 30;

export const useSearchHistory = (): UseSearchHistoryReturn => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to generate unique ID
  const generateId = useCallback((): string => {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Load search history from storage
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [historyData, popularData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.POPULAR_SEARCHES)
      ]);

      // Parse and validate history data
      if (historyData) {
        try {
          const parsedHistory: SearchHistoryItem[] = JSON.parse(historyData);
          
          // Validate and filter history items
          const validHistory = parsedHistory.filter(item => 
            item.id && 
            typeof item.query === 'string' && 
            item.timestamp && 
            typeof item.resultsCount === 'number'
          );

          // Remove expired items
          const cutoffTime = Date.now() - (HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
          const currentHistory = validHistory.filter(item => item.timestamp > cutoffTime);

          setSearchHistory(currentHistory);
        } catch (parseError) {
          SecureErrorHandler.logError(parseError as Error, { action: 'parseSearchHistory' });
          setSearchHistory([]);
        }
      }

      // Parse and validate popular searches
      if (popularData) {
        try {
          const parsedPopular: PopularSearch[] = JSON.parse(popularData);
          
          const validPopular = parsedPopular.filter(item =>
            typeof item.query === 'string' &&
            typeof item.count === 'number' &&
            typeof item.lastUsed === 'number'
          );

          setPopularSearches(validPopular);
        } catch (parseError) {
          SecureErrorHandler.logError(parseError as Error, { action: 'parsePopularSearches' });
          setPopularSearches([]);
        }
      }

    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      SecureErrorHandler.logError(error as Error, { action: 'loadSearchHistory' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Save search history to storage
  const saveHistory = useCallback(async (history: SearchHistoryItem[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'saveSearchHistory' });
    }
  }, []);

  // Save popular searches to storage
  const savePopularSearches = useCallback(async (popular: PopularSearch[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.POPULAR_SEARCHES, JSON.stringify(popular));
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'savePopularSearches' });
    }
  }, []);

  // Add a new search to history
  const addSearch = useCallback(async (
    query: string,
    filters: AdvancedSearchFilters,
    resultsCount: number
  ): Promise<void> => {
    try {
      // Sanitize and validate query
      const sanitizedQuery = ValidationUtils.sanitizeSearchQuery(query).trim();
      if (sanitizedQuery.length < 2) return;

      const searchItem: SearchHistoryItem = {
        id: generateId(),
        query: sanitizedQuery,
        filters: { ...filters },
        timestamp: Date.now(),
        resultsCount
      };

      // Update search history
      setSearchHistory(prevHistory => {
        // Remove any existing identical search
        const filteredHistory = prevHistory.filter(item => 
          item.query !== sanitizedQuery || 
          JSON.stringify(item.filters) !== JSON.stringify(filters)
        );

        // Add new search at the beginning and limit size
        const newHistory = [searchItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
        
        // Save to storage (non-blocking)
        saveHistory(newHistory);
        
        return newHistory;
      });

      // Update popular searches
      setPopularSearches(prevPopular => {
        const existingIndex = prevPopular.findIndex(item => item.query === sanitizedQuery);
        
        let newPopular: PopularSearch[];
        
        if (existingIndex >= 0) {
          // Update existing popular search
          newPopular = prevPopular.map((item, index) => 
            index === existingIndex 
              ? { ...item, count: item.count + 1, lastUsed: Date.now() }
              : item
          );
        } else {
          // Add new popular search
          const newItem: PopularSearch = {
            query: sanitizedQuery,
            count: 1,
            lastUsed: Date.now()
          };
          newPopular = [newItem, ...prevPopular];
        }

        // Sort by count and limit size
        newPopular = newPopular
          .sort((a, b) => b.count - a.count)
          .slice(0, MAX_POPULAR_SEARCHES);

        // Save to storage (non-blocking)
        savePopularSearches(newPopular);

        return newPopular;
      });

    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'addSearchToHistory',
        query: ValidationUtils.sanitizeSearchQuery(query)
      });
    }
  }, [generateId, saveHistory, savePopularSearches]);

  // Remove specific search from history
  const removeFromHistory = useCallback(async (searchId: string): Promise<void> => {
    try {
      setSearchHistory(prevHistory => {
        const newHistory = prevHistory.filter(item => item.id !== searchId);
        saveHistory(newHistory); // Non-blocking save
        return newHistory;
      });
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { 
        action: 'removeFromSearchHistory',
        searchId
      });
    }
  }, [saveHistory]);

  // Clear all search history
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'clearSearchHistory' });
    }
  }, []);

  // Clear popular searches
  const clearPopularSearches = useCallback(async (): Promise<void> => {
    try {
      setPopularSearches([]);
      await AsyncStorage.removeItem(STORAGE_KEYS.POPULAR_SEARCHES);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'clearPopularSearches' });
    }
  }, []);

  // Generate search suggestions based on history
  const getSearchSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (query.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Add suggestions from search history
    const historySuggestions = searchHistory
      .filter(item => item.query.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map(item => ({
        type: 'recipe' as const,
        value: item.query,
        label: item.query,
        count: item.resultsCount
      }));

    // Add suggestions from popular searches
    const popularSuggestions = popularSearches
      .filter(item => item.query.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map(item => ({
        type: 'recipe' as const,
        value: item.query,
        label: `${item.query} (${item.count} recherches)`,
        count: item.count
      }));

    suggestions.push(...historySuggestions);
    
    // Add popular suggestions that aren't already included
    popularSuggestions.forEach(suggestion => {
      if (!suggestions.find(s => s.value === suggestion.value)) {
        suggestions.push(suggestion);
      }
    });

    return suggestions.slice(0, 8); // Limit total suggestions
  }, [searchHistory, popularSearches]);

  // Computed values
  const recentQueries = useMemo(() => 
    searchHistory.slice(0, 10).map(item => item.query),
    [searchHistory]
  );

  const searchStats = useMemo((): SearchStats => {
    if (searchHistory.length === 0) {
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0
      };
    }

    const uniqueQueries = new Set(searchHistory.map(item => item.query)).size;
    const totalResults = searchHistory.reduce((sum, item) => sum + item.resultsCount, 0);
    const averageResults = totalResults / searchHistory.length;

    // Find most popular category and difficulty from filters
    const categories: { [key: string]: number } = {};
    const difficulties: { [key: string]: number } = {};

    searchHistory.forEach(item => {
      if (item.filters.category) {
        categories[item.filters.category] = (categories[item.filters.category] || 0) + 1;
      }
      if (item.filters.difficulty) {
        difficulties[item.filters.difficulty] = (difficulties[item.filters.difficulty] || 0) + 1;
      }
    });

    const mostPopularCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const mostPopularDifficulty = Object.entries(difficulties)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return {
      totalSearches: searchHistory.length,
      uniqueQueries,
      averageResultsPerSearch: Math.round(averageResults * 10) / 10,
      mostPopularCategory,
      mostPopularDifficulty
    };
  }, [searchHistory]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Cleanup old history periodically
  useEffect(() => {
    const cleanup = () => {
      const cutoffTime = Date.now() - (HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      setSearchHistory(prevHistory => {
        const currentHistory = prevHistory.filter(item => item.timestamp > cutoffTime);
        if (currentHistory.length !== prevHistory.length) {
          saveHistory(currentHistory); // Save cleaned history
        }
        return currentHistory;
      });
    };

    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    
    // Run initial cleanup after 5 minutes
    const initialCleanup = setTimeout(cleanup, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialCleanup);
    };
  }, [saveHistory]);

  const actions = useMemo(() => ({
    addSearch,
    removeFromHistory,
    clearHistory,
    clearPopularSearches,
    getSearchSuggestions,
    loadHistory
  }), [
    addSearch,
    removeFromHistory,
    clearHistory,
    clearPopularSearches,
    getSearchSuggestions,
    loadHistory
  ]);

  return {
    searchHistory,
    popularSearches,
    recentQueries,
    searchStats,
    loading,
    error,
    actions
  };
};