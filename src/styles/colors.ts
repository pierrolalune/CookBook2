export const colors = {
  // Primary colors from mockup
  primary: '#667eea',
  primaryDark: '#764ba2',
  primaryLight: 'rgba(102, 126, 234, 0.1)',
  
  // Favorites
  favorite: '#ff6b6b',
  favoriteActive: '#ff4757',
  favoriteLight: 'rgba(255, 107, 107, 0.2)',
  
  // Background colors
  background: '#f8f9fa',
  backgroundLight: '#ffffff',
  backgroundDark: '#000000',
  backgroundGlass: 'rgba(255, 255, 255, 0.95)',
  
  // Text colors
  textPrimary: '#2c3e50',      // Darker, more professional
  textSecondary: '#95a5a6',    // Softer gray
  textLight: '#999999',
  textWhite: '#ffffff',
  
  // Border and divider colors
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  
  // Category colors
  fruits: '#ffe4e1',
  vegetables: '#e8f5e9',
  fish: '#e1f5fe',
  meat: '#ffebee',
  grocery: '#fff3e0',
  seasonal: '#f3e5f5',
  myproduct: '#e8eaf6',
  favoris: 'rgba(255, 107, 107, 0.2)',
  
  // Status colors
  success: '#4caf50',
  successLight: 'rgba(76, 175, 80, 0.1)',
  warning: '#ff9800',
  warningLight: 'rgba(255, 152, 0, 0.1)',
  error: '#f44336',
  errorLight: 'rgba(244, 67, 54, 0.1)',
  info: '#2196f3',
  accent: '#ff6b6b',
  secondary: '#6c757d',
  
  // Seasonal colors and badges
  seasonDebut: '#2ecc71',      // Green for beginning
  seasonPic: '#e67e22',        // Orange for peak
  seasonFin: '#95a5a6',        // Gray for end
  inSeason: '#4caf50',
  peakSeason: '#ff9800',
  beginningOfSeason: '#81c784',
  endOfSeason: '#8d6e63',
  outOfSeason: '#757575',
  
  // Modern gradients matching mockup
  primaryGradient: ['#667eea', '#764ba2'],
  favoriteGradient: ['#ff6b6b', '#feca57'],
  seasonalGradient: ['#a8edea', '#fed6e3'],
  
  // Modern shadow system
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 25,
      elevation: 8,
    },
  },
} as const;

export type ColorKey = keyof typeof colors;