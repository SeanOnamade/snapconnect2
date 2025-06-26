// SnapConnect2 Theme - Turquoise & Orange
export const theme = {
  colors: {
    // Primary Colors - Turquoise
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1', 
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf', // Main turquoise
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    
    // Secondary Colors - Orange
    secondary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c', // Main orange
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    
    // Neutral Colors
    neutral: {
      white: '#ffffff',
      black: '#000000',
      gray: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      }
    },
    
    // Status Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Background Gradients
    gradients: {
      primary: ['#2dd4bf', '#14b8a6'], // Turquoise gradient
      secondary: ['#fb923c', '#f97316'], // Orange gradient
      sunset: ['#2dd4bf', '#fb923c'], // Turquoise to Orange
      ocean: ['#0d9488', '#2dd4bf'], // Deep to light turquoise
    }
  },
  
  // Common styling patterns
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 10,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10.32,
      elevation: 15,
    }
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 50,
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  }
}; 