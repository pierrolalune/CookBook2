// Database row interfaces for type safety
export interface IngredientRow {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  units: string; // JSON string
  seasonal_months: string | null; // JSON string
  seasonal_peak_months: string | null; // JSON string
  seasonal_season: string | null;
  is_user_created: number; // SQLite boolean as integer
  description: string | null;
  tags: string | null; // JSON string
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_favorite?: number; // Added by JOIN with favorites table
}

export interface FavoriteRow {
  id: string;
  ingredient_id: string;
  created_at: string;
}

export interface CountRow {
  count: number;
}

export interface SQLiteResult {
  changes: number;
  insertId?: number;
}

export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sql?: string;
}

// Form data interfaces
export interface FormFieldError {
  field: string;
  message: string;
}

export interface ComponentStyleProps {
  style?: Record<string, unknown>;
}

export interface ComponentProps extends ComponentStyleProps {
  children?: React.ReactNode;
}

// Event handler interfaces
export interface PressEvent {
  nativeEvent: {
    timestamp: number;
  };
}

export interface TextInputEvent {
  nativeEvent: {
    text: string;
    previousText: string;
    range: {
      start: number;
      end: number;
    };
  };
}

// Animation interfaces
export interface AnimationConfig {
  duration: number;
  useNativeDriver: boolean;
  delay?: number;
}

export interface SpringConfig extends AnimationConfig {
  tension?: number;
  friction?: number;
}

// Hook return types
export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface AsyncOperationActions {
  retry: () => Promise<void>;
  reset: () => void;
}

// Repository method parameters
export interface FindAllParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SearchParams extends FindAllParams {
  query: string;
  searchFields?: string[];
}

// Security interfaces
export interface SanitizedInput {
  value: string;
  wasModified: boolean;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// Error boundary interfaces
export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}