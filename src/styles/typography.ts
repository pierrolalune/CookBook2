export const typography = {
  // Font sizes
  sizes: {
    xs: 10,
    sm: 11,
    md: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
  },
  
  // Font weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  
  // Common text styles
  styles: {
    h1: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h2: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    h3: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    small: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 14,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },
} as const;