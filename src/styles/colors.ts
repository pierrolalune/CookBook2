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
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
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
  
  // Seasonal colors
  inSeason: '#4caf50',
  peakSeason: '#ff9800',
  beginningOfSeason: '#81c784',
  endOfSeason: '#8d6e63',
  outOfSeason: '#757575',
  
  // Gradients (for StyleSheet, you'll need to use libraries like react-native-linear-gradient)
  primaryGradient: ['#667eea', '#764ba2'],
  favoriteGradient: ['#ff6b6b', '#feca57'],
} as const;

export type ColorKey = keyof typeof colors;