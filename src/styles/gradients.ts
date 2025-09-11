import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './colors';

export interface GradientConfig {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
}

// Common gradient configurations matching the mockup
export const gradientPresets = {
  // Main header gradient
  header: {
    colors: ['#667eea', '#764ba2'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Glass morphism background
  glass: {
    colors: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.08)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Category pill gradients
  categoryAll: {
    colors: ['#667eea', '#764ba2'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryFavoris: {
    colors: ['#ff6b9d', '#ff8c42'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryEntree: {
    colors: ['#4ecdc4', '#44a3aa'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryPlats: {
    colors: ['#f093fb', '#f5576c'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryDessert: {
    colors: ['#ffd700', '#ffb347'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryVegetarien: {
    colors: ['#43e97b', '#38f9d7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categoryPates: {
    colors: ['#fa709a', '#fee140'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  categorySoupes: {
    colors: ['#30cfd0', '#330867'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Button gradients
  buttonCart: {
    colors: ['#4ecdc4', '#4facfe'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  buttonCook: {
    colors: ['#ff6b9d', '#ff8c42'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  buttonModeCuisine: {
    colors: ['#ffd700', '#ff8c42'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Background gradient
  backgroundDark: {
    colors: ['#0a0e27', '#050714'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // Filter button active state
  filterActive: {
    colors: ['#4ecdc4', '#4facfe'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

// Utility function to get gradient config by category
export const getCategoryGradient = (category: string): GradientConfig => {
  switch (category) {
    case 'all':
      return gradientPresets.categoryAll;
    case 'favoris':
      return gradientPresets.categoryFavoris;
    case 'entree':
      return gradientPresets.categoryEntree;
    case 'plats':
      return gradientPresets.categoryPlats;
    case 'dessert':
      return gradientPresets.categoryDessert;
    case 'vegetarien':
      return gradientPresets.categoryVegetarien;
    case 'pates':
      return gradientPresets.categoryPates;
    case 'soupes':
      return gradientPresets.categorySoupes;
    default:
      return gradientPresets.categoryAll;
  }
};

// Utility for creating gradient text color (for React Native text)
export const getGradientTextStyle = (gradientColors: string[]) => ({
  // Note: React Native doesn't support gradient text natively
  // We'll use the first color as fallback
  color: gradientColors[0],
});

export type GradientPresetKey = keyof typeof gradientPresets;