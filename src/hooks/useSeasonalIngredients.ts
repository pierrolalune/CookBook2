import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ingredient } from '../types';
import { SeasonalUtils } from '../utils/seasonalUtils';
import { useIngredients } from './useIngredients';

export const useSeasonalIngredients = () => {
  const { ingredients, loading, error } = useIngredients();
  const [currentMonth, setCurrentMonth] = useState(SeasonalUtils.getCurrentMonth());

  const seasonalData = useMemo(() => {
    if (!ingredients.length) {
      return {
        currentSeason: [],
        peakSeason: [],
        comingSoon: [],
        outOfSeason: [],
        yearRound: []
      };
    }

    const recommendations = SeasonalUtils.getSeasonalRecommendations(ingredients);
    
    const outOfSeason = ingredients.filter(ingredient => {
      const status = SeasonalUtils.getIngredientSeasonStatus(ingredient);
      return status === 'out-of-season';
    });
    
    const yearRound = ingredients.filter(ingredient => {
      const status = SeasonalUtils.getIngredientSeasonStatus(ingredient);
      return status === 'year-round';
    });

    return {
      currentSeason: recommendations.currentSeason,
      peakSeason: recommendations.peakSeason,
      comingSoon: recommendations.comingSoon,
      outOfSeason,
      yearRound
    };
  }, [ingredients, currentMonth]);

  const getIngredientSeasonStatus = useCallback((ingredient: Ingredient) => {
    return SeasonalUtils.getIngredientSeasonStatus(ingredient);
  }, [currentMonth]);

  const isIngredientInSeason = useCallback((ingredient: Ingredient): boolean => {
    return SeasonalUtils.isIngredientInSeason(ingredient);
  }, [currentMonth]);

  const isIngredientInPeakSeason = useCallback((ingredient: Ingredient): boolean => {
    return SeasonalUtils.isIngredientInPeakSeason(ingredient);
  }, [currentMonth]);

  const getNextSeasonStartDate = useCallback((ingredient: Ingredient): Date | null => {
    return SeasonalUtils.getNextSeasonStartDate(ingredient);
  }, [currentMonth]);

  const filterBySeasonStatus = useCallback((ingredients: Ingredient[], status: 'in-season' | 'peak-season' | 'out-of-season' | 'year-round'): Ingredient[] => {
    return ingredients.filter(ingredient => getIngredientSeasonStatus(ingredient) === status);
  }, [getIngredientSeasonStatus]);

  const getCurrentSeasonName = useCallback((): string => {
    return SeasonalUtils.getSeasonName(SeasonalUtils.getCurrentSeason());
  }, [currentMonth]);

  const getSeasonForMonth = useCallback((month: number): string => {
    return SeasonalUtils.getSeasonName(SeasonalUtils.getSeasonForMonth(month));
  }, []);

  // Update current month every day (useful for long-running app sessions)
  useEffect(() => {
    const checkMonth = () => {
      const newMonth = SeasonalUtils.getCurrentMonth();
      if (newMonth !== currentMonth) {
        setCurrentMonth(newMonth);
      }
    };

    // Check for month change every hour
    const interval = setInterval(checkMonth, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentMonth]);

  const stats = useMemo(() => {
    return {
      total: ingredients.length,
      inSeason: seasonalData.currentSeason.length,
      peakSeason: seasonalData.peakSeason.length,
      comingSoon: seasonalData.comingSoon.length,
      outOfSeason: seasonalData.outOfSeason.length,
      yearRound: seasonalData.yearRound.length,
      seasonal: ingredients.filter(ing => ing.seasonal).length,
      nonSeasonal: ingredients.filter(ing => !ing.seasonal).length
    };
  }, [ingredients, seasonalData]);

  return {
    loading,
    error,
    currentMonth,
    currentSeason: getCurrentSeasonName(),
    seasonalData,
    stats,
    actions: {
      getIngredientSeasonStatus,
      isIngredientInSeason,
      isIngredientInPeakSeason,
      getNextSeasonStartDate,
      filterBySeasonStatus,
      getCurrentSeasonName,
      getSeasonForMonth
    }
  };
};