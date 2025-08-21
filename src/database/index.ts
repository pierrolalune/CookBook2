import { SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';
import { xmlDataLoader } from '../utils/xmlParser';

export const DATABASE_NAME = 'cookbook.db';

let db: SQLiteDatabase | null = null;

export const initializeDatabase = async (): Promise<SQLiteDatabase> => {
  console.log('🚀 [DB] Starting simple database initialization...');

  try {
    // If already initialized, return it
    if (db) {
      console.log('✅ [DB] Database already ready');
      return db;
    }

    // Open database
    console.log('📱 [DB] Opening database connection...');
    db = openDatabaseSync(DATABASE_NAME);
    
    // Set basic pragmas
    console.log('⚙️ [DB] Setting pragmas...');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables if they don't exist
    await createTablesIfNeeded(db);
    
    // Run migrations to update existing tables
    await runMigrations(db);
    
    // Seed database if empty
    await seedDatabaseIfEmpty(db);
    
    console.log('✅ [DB] Database initialization complete');
    return db;
    
  } catch (error) {
    console.error('❌ [DB] Initialization failed:', error);
    db = null;
    throw error;
  }
};

// Simple table creation
const createTablesIfNeeded = async (db: SQLiteDatabase): Promise<void> => {
  console.log('🏗️ [DB] Creating tables if needed...');
  
  try {
    // Create ingredients table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        units TEXT NOT NULL,
        seasonal_months TEXT,
        seasonal_peak_months TEXT,
        seasonal_season TEXT,
        is_user_created INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        tags TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create favorites table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        ingredient_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE,
        UNIQUE(ingredient_id)
      );
    `);
    
    // Create recipes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty TEXT,
        category TEXT NOT NULL,
        photo_uri TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create recipe_ingredients table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        optional INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (id)
      );
    `);
    
    // Create recipe_instructions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipe_instructions (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        instruction TEXT NOT NULL,
        duration INTEGER,
        estimated_time INTEGER,
        temperature TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
      );
    `);
    
    // Create recipe_usage table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipe_usage (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
      );
    `);
    
    // Create recipe_photos table for multiple photos per recipe
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipe_photos (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        photo_uri TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_favorites_ingredient_id ON favorites(ingredient_id);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipe_usage_recipe_id ON recipe_usage(recipe_id);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_recipe_photos_recipe_id ON recipe_photos(recipe_id);');
    
    console.log('✅ [DB] Tables created/verified');
  } catch (error) {
    console.error('❌ [DB] Table creation failed:', error);
    throw error;
  }
};

// Database migrations for schema updates
const runMigrations = async (db: SQLiteDatabase): Promise<void> => {
  console.log('🔄 [DB] Running database migrations...');
  
  try {
    // Check if estimated_time column exists in recipe_instructions table
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(recipe_instructions);`) as any[];
    const hasEstimatedTime = tableInfo.some(col => col.name === 'estimated_time');
    
    if (!hasEstimatedTime) {
      console.log('📝 [DB] Adding estimated_time column to recipe_instructions...');
      await db.execAsync(`ALTER TABLE recipe_instructions ADD COLUMN estimated_time INTEGER;`);
      console.log('✅ [DB] Added estimated_time column successfully');
    }
    
    // Check if temperature column exists and is correct type
    const temperatureCol = tableInfo.find(col => col.name === 'temperature');
    if (temperatureCol && temperatureCol.type !== 'TEXT') {
      console.log('📝 [DB] Updating temperature column type in recipe_instructions...');
      // Note: SQLite doesn't support ALTER COLUMN, so we'll need to recreate the table
      // For now, we'll log this as a known issue
      console.log('⚠️ [DB] Temperature column type needs manual migration - consider database reset');
    }
    
    console.log('✅ [DB] Database migrations complete');
  } catch (error) {
    console.error('❌ [DB] Migration failed:', error);
    // Don't throw - let initialization continue
  }
};

// Simple seeding
const seedDatabaseIfEmpty = async (db: SQLiteDatabase): Promise<void> => {
  console.log('🌱 [DB] Checking if seeding needed...');
  
  try {
    // Check if we have ingredients
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM ingredients') as { count: number };
    
    if (result.count > 0) {
      console.log(`✅ [DB] Database already has ${result.count} ingredients, skipping seed`);
      return;
    }
    
    console.log('📦 [DB] Loading ingredients from XML...');
    const ingredients = await xmlDataLoader.loadIngredientsFromAssets();
    
    if (ingredients.length === 0) {
      console.log('⚠️ [DB] No ingredients found to seed');
      return;
    }
    
    console.log(`📥 [DB] Inserting ${ingredients.length} ingredients one by one...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      
      try {
        await db.runAsync(`
          INSERT OR IGNORE INTO ingredients (
            id, name, category, subcategory, units, 
            seasonal_months, seasonal_peak_months, seasonal_season,
            is_user_created, description, tags, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ingredient.id,
          ingredient.name,
          ingredient.category,
          ingredient.subcategory,
          JSON.stringify(ingredient.units),
          ingredient.seasonal ? JSON.stringify(ingredient.seasonal.months) : null,
          ingredient.seasonal ? JSON.stringify(ingredient.seasonal.peak_months) : null,
          ingredient.seasonal ? ingredient.seasonal.season : null,
          ingredient.isUserCreated ? 1 : 0,
          ingredient.description || null,
          ingredient.tags ? JSON.stringify(ingredient.tags) : null,
          ingredient.notes || null,
          ingredient.createdAt.toISOString(),
          ingredient.updatedAt.toISOString()
        ]);
        
        successCount++;
        
        // Log progress every 25 items
        if ((i + 1) % 25 === 0) {
          console.log(`📥 [DB] Progress: ${i + 1}/${ingredients.length} (${successCount} successful)`);
        }
        
      } catch (error) {
        errorCount++;
        console.warn(`⚠️ [DB] Failed to insert ${ingredient.name}:`, error);
      }
    }
    
    console.log(`✅ [DB] Seeding complete: ${successCount} successful, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ [DB] Seeding failed:', error);
    // Don't throw - let initialization continue
  }
};

export const getDatabase = (): SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('🔄 [DB] Database closed');
  }
};

export const isDatabaseInitialized = (): boolean => {
  return db !== null;
};

// Development utility to reset database
export const resetDatabase = async (): Promise<void> => {
  // If database is not initialized, initialize it first
  if (!db) {
    console.log('📱 [DB] Opening database for reset...');
    db = openDatabaseSync(DATABASE_NAME);
  }

  console.log('🧹 [DB] Resetting database...');
  
  try {
    // Drop tables in correct order (due to foreign key constraints)
    await db.execAsync('DROP TABLE IF EXISTS recipe_photos;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_usage;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_instructions;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_ingredients;');
    await db.execAsync('DROP TABLE IF EXISTS recipes;');
    await db.execAsync('DROP TABLE IF EXISTS favorites;');
    await db.execAsync('DROP TABLE IF EXISTS ingredients;');
    console.log('✅ [DB] Database reset complete');
    
    // Reset state so it can be reinitialized
    db = null;
  } catch (error) {
    console.error('❌ [DB] Database reset failed:', error);
    throw error;
  }
};