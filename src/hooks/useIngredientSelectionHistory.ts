import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureErrorHandler } from '../utils/errorHandler';

interface IngredientSelection {
  id: string;
  name: string;
  ingredientIds: string[];
  matchThreshold: number;
  createdAt: string;
  usageCount: number;
  lastUsedAt: string;
}

interface UseIngredientSelectionHistoryReturn {
  history: IngredientSelection[];
  loading: boolean;
  saveSelection: (name: string, ingredientIds: string[], matchThreshold: number) => Promise<void>;
  deleteSelection: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getPopularSelections: (limit?: number) => IngredientSelection[];
  getRecentSelections: (limit?: number) => IngredientSelection[];
}

const STORAGE_KEY = '@ingredient_selection_history';
const MAX_HISTORY_SIZE = 50;

export const useIngredientSelectionHistory = (): UseIngredientSelectionHistoryReturn => {
  const [history, setHistory] = useState<IngredientSelection[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from AsyncStorage
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as IngredientSelection[];
        setHistory(parsed);
      }
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'loadIngredientSelectionHistory' });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save history to AsyncStorage
  const saveHistoryToStorage = useCallback(async (newHistory: IngredientSelection[]) => {
    try {
      // Keep only the most recent entries
      const trimmedHistory = newHistory
        .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
        .slice(0, MAX_HISTORY_SIZE);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      setHistory(trimmedHistory);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'saveIngredientSelectionHistory' });
    }
  }, []);

  // Save a new ingredient selection
  const saveSelection = useCallback(async (
    name: string, 
    ingredientIds: string[], 
    matchThreshold: number
  ) => {
    try {
      const now = new Date().toISOString();
      
      // Check if this selection already exists (same ingredient combination)
      const existingIndex = history.findIndex(selection => 
        selection.ingredientIds.length === ingredientIds.length &&
        selection.ingredientIds.every(id => ingredientIds.includes(id)) &&
        ingredientIds.every(id => selection.ingredientIds.includes(id))
      );

      let newHistory: IngredientSelection[];

      if (existingIndex >= 0) {
        // Update existing selection
        newHistory = [...history];
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          name: name || newHistory[existingIndex].name,
          matchThreshold,
          usageCount: newHistory[existingIndex].usageCount + 1,
          lastUsedAt: now
        };
      } else {
        // Create new selection
        const newSelection: IngredientSelection = {
          id: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: name || `Sélection ${history.length + 1}`,
          ingredientIds,
          matchThreshold,
          createdAt: now,
          usageCount: 1,
          lastUsedAt: now
        };

        newHistory = [newSelection, ...history];
      }

      await saveHistoryToStorage(newHistory);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'saveIngredientSelection' });
    }
  }, [history, saveHistoryToStorage]);

  // Delete a selection from history
  const deleteSelection = useCallback(async (id: string) => {
    try {
      const newHistory = history.filter(selection => selection.id !== id);
      await saveHistoryToStorage(newHistory);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'deleteIngredientSelection' });
    }
  }, [history, saveHistoryToStorage]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'clearIngredientSelectionHistory' });
    }
  }, []);

  // Get popular selections (most used)
  const getPopularSelections = useCallback((limit: number = 5): IngredientSelection[] => {
    return [...history]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }, [history]);

  // Get recent selections (most recently used)
  const getRecentSelections = useCallback((limit: number = 5): IngredientSelection[] => {
    return [...history]
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
      .slice(0, limit);
  }, [history]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    saveSelection,
    deleteSelection,
    clearHistory,
    getPopularSelections,
    getRecentSelections
  };
};