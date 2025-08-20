import { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'cookbook.db';
export const DATABASE_VERSION = 1;

export const createTables = async (db: SQLiteDatabase): Promise<void> => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        units TEXT NOT NULL, -- JSON array of units
        seasonal_months TEXT, -- JSON array of months (1-12)
        seasonal_peak_months TEXT, -- JSON array of peak months
        seasonal_season TEXT, -- season name
        is_user_created INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
        description TEXT,
        tags TEXT, -- JSON array of tags
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        ingredient_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE,
        UNIQUE(ingredient_id)
      );

      -- Index for better query performance
      CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
      CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
      CREATE INDEX IF NOT EXISTS idx_ingredients_user_created ON ingredients(is_user_created);
      CREATE INDEX IF NOT EXISTS idx_favorites_ingredient_id ON favorites(ingredient_id);

      -- Trigger to update updated_at timestamp
      CREATE TRIGGER IF NOT EXISTS update_ingredients_updated_at
        AFTER UPDATE ON ingredients
        BEGIN
          UPDATE ingredients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

export const dropTables = async (db: SQLiteDatabase): Promise<void> => {
  try {
    await db.execAsync(`
      DROP TRIGGER IF EXISTS update_ingredients_updated_at;
      DROP INDEX IF EXISTS idx_favorites_ingredient_id;
      DROP INDEX IF EXISTS idx_ingredients_user_created;
      DROP INDEX IF EXISTS idx_ingredients_name;
      DROP INDEX IF EXISTS idx_ingredients_category;
      DROP TABLE IF EXISTS favorites;
      DROP TABLE IF EXISTS ingredients;
    `);
    
    console.log('Database tables dropped successfully');
  } catch (error) {
    console.error('Error dropping database tables:', error);
    throw error;
  }
};