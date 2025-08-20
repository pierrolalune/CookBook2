export const spacing = {
  // Basic spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  
  // Common paddings and margins
  screenPadding: 20,
  cardPadding: 12,
  sectionPadding: 15,
  
  // Border radius
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 20,
    full: 9999,
  },
  
  // Common margins and paddings
  cardMargin: 10,
  
  // Component specific spacing
  component: {
    buttonPadding: 15,
    inputPadding: 14,
    listItemSpacing: 8,
    iconSize: 40,
    smallIconSize: 24,
    headerHeight: 60,
    tabHeight: 48,
  },
} as const;