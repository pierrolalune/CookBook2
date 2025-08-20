import { Ingredient } from '../types';

export class SeasonalUtils {
  static getCurrentMonth(): number {
    return new Date().getMonth() + 1; // JavaScript months are 0-indexed
  }

  static getCurrentSeason(): string {
    const month = this.getCurrentMonth();
    return this.getSeasonForMonth(month);
  }

  static getSeasonForMonth(month: number): string {
    if (month >= 3 && month <= 5) {
      return 'printemps';
    } else if (month >= 6 && month <= 8) {
      return 'été';
    } else if (month >= 9 && month <= 11) {
      return 'automne';
    } else {
      return 'hiver';
    }
  }

  static isIngredientInSeason(ingredient: Ingredient): boolean {
    if (!ingredient.seasonal) {
      return true; // Non-seasonal ingredients are always "in season"
    }

    const currentMonth = this.getCurrentMonth();
    return ingredient.seasonal.months.includes(currentMonth);
  }

  static isIngredientInPeakSeason(ingredient: Ingredient): boolean {
    if (!ingredient.seasonal) {
      return false;
    }

    const currentMonth = this.getCurrentMonth();
    return ingredient.seasonal.peak_months.includes(currentMonth);
  }

  static getSeasonalIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter(ingredient => this.isIngredientInSeason(ingredient));
  }

  static getPeakSeasonalIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter(ingredient => this.isIngredientInPeakSeason(ingredient));
  }

  static getIngredientSeasonStatus(ingredient: Ingredient): 'in-season' | 'peak-season' | 'out-of-season' | 'year-round' {
    if (!ingredient.seasonal) {
      return 'year-round';
    }

    const currentMonth = this.getCurrentMonth();
    
    if (ingredient.seasonal.peak_months.includes(currentMonth)) {
      return 'peak-season';
    } else if (ingredient.seasonal.months.includes(currentMonth)) {
      return 'in-season';
    } else {
      return 'out-of-season';
    }
  }

  static getNextSeasonStartDate(ingredient: Ingredient): Date | null {
    if (!ingredient.seasonal) {
      return null;
    }

    const currentMonth = this.getCurrentMonth();
    const currentYear = new Date().getFullYear();
    
    // Find the next month when this ingredient is in season
    for (let monthOffset = 1; monthOffset <= 12; monthOffset++) {
      let checkMonth = currentMonth + monthOffset;
      let checkYear = currentYear;
      
      if (checkMonth > 12) {
        checkMonth -= 12;
        checkYear += 1;
      }
      
      if (ingredient.seasonal.months.includes(checkMonth)) {
        return new Date(checkYear, checkMonth - 1, 1); // JavaScript Date uses 0-indexed months
      }
    }
    
    return null;
  }

  static getSeasonalRecommendations(ingredients: Ingredient[]): {
    currentSeason: Ingredient[];
    peakSeason: Ingredient[];
    comingSoon: Ingredient[];
  } {
    const currentSeason = this.getSeasonalIngredients(ingredients);
    const peakSeason = this.getPeakSeasonalIngredients(ingredients);
    
    // Get ingredients that will be in season next month
    const nextMonth = this.getCurrentMonth() === 12 ? 1 : this.getCurrentMonth() + 1;
    const comingSoon = ingredients.filter(ingredient => 
      ingredient.seasonal && 
      !ingredient.seasonal.months.includes(this.getCurrentMonth()) &&
      ingredient.seasonal.months.includes(nextMonth)
    );

    return {
      currentSeason,
      peakSeason,
      comingSoon
    };
  }

  static getMonthName(month: number): string {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return monthNames[month - 1] || '';
  }

  static getSeasonName(season: string): string {
    const seasonMap: { [key: string]: string } = {
      'printemps': 'Printemps',
      'été': 'Été',
      'automne': 'Automne',
      'hiver': 'Hiver',
      'printemps-été': 'Printemps-Été',
      'été-automne': 'Été-Automne',
      'automne-hiver': 'Automne-Hiver',
      'hiver-printemps': 'Hiver-Printemps',
      'fin été': 'Fin d\'été',
      'fin été-automne': 'Fin d\'été - Automne'
    };
    return seasonMap[season] || season;
  }
}