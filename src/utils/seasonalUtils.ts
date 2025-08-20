import { Ingredient, DetailedSeasonStatus } from '../types';

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
      return false; // Non-seasonal ingredients are NOT considered "in season"
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

  static getDetailedSeasonStatus(ingredient: Ingredient): DetailedSeasonStatus {
    if (!ingredient.seasonal) {
      return 'year-round';
    }

    const currentMonth = this.getCurrentMonth();
    const { months, peak_months } = ingredient.seasonal;
    
    if (!months.includes(currentMonth)) {
      return 'out-of-season';
    }
    
    // Check if in peak season
    if (peak_months.includes(currentMonth)) {
      return 'peak-season';
    }
    
    // Check if it's the first month of the season
    const sortedMonths = [...months].sort((a, b) => a - b);
    const currentIndex = sortedMonths.indexOf(currentMonth);
    
    // Handle year-crossing seasons (e.g., December to February)
    let isBeginning = false;
    let isEnd = false;
    
    if (sortedMonths.length > 1) {
      // Check if it's a continuous season or split (winter crops)
      const gaps = [];
      for (let i = 1; i < sortedMonths.length; i++) {
        if (sortedMonths[i] - sortedMonths[i-1] > 1) {
          gaps.push(i);
        }
      }
      
      // Also check wrap-around (December to January)
      if (sortedMonths.includes(12) && sortedMonths.includes(1)) {
        if (sortedMonths[sortedMonths.length - 1] === 12 && sortedMonths[0] === 1) {
          // This is a continuous season crossing year boundary
        } else {
          gaps.push(0);
        }
      }
      
      if (gaps.length === 0) {
        // Continuous season
        isBeginning = currentIndex === 0;
        isEnd = currentIndex === sortedMonths.length - 1;
      } else {
        // Split season - find which segment we're in
        let segmentStart = 0;
        let segmentEnd = sortedMonths.length - 1;
        
        for (let gap of gaps) {
          if (currentIndex < gap) {
            segmentEnd = gap - 1;
            break;
          } else {
            segmentStart = gap;
          }
        }
        
        isBeginning = currentIndex === segmentStart;
        isEnd = currentIndex === segmentEnd;
      }
    } else {
      // Single month season
      isBeginning = true;
      isEnd = true;
    }
    
    if (isBeginning && !isEnd) {
      return 'beginning-of-season';
    }
    
    if (isEnd && !isBeginning) {
      return 'end-of-season';
    }
    
    return 'in-season';
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