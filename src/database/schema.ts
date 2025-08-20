import { SQLiteDatabase } from 'expo-sqlite';
import { xmlDataLoader } from '../utils/xmlParser';
import { IngredientRepository } from '../repositories/IngredientRepository';

export const DATABASE_NAME = 'cookbook.db';
export const DATABASE_VERSION = 3;

export const createTables = async (db: SQLiteDatabase): Promise<void> => {
  try {
    console.log(" --> Deb createTables <-- ");

    // Set SQLite pragmas
    try {
      console.log('Setting PRAGMA journal_mode...');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      console.log('Setting PRAGMA foreign_keys...');
      await db.execAsync('PRAGMA foreign_keys = ON;');
    } catch (error) {
      console.error('Error setting pragmas:', error);
      throw error;
    }

    // Create ingredients table
    try {
      console.log('Creating ingredients table...');
      await db.execAsync(`
        CREATE TABLE ingredients (
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
      console.log('✅ Ingredients table created successfully');

      // Verify the table was created with correct schema
      const tableInfo = await db.getAllAsync('PRAGMA table_info(ingredients)');
      console.log('Ingredients table schema:', tableInfo);

    } catch (error) {
      console.error('Error creating ingredients table:', error);
      throw error;
    }

    // Create favorites table
    try {
      console.log('Creating favorites table...');
      await db.execAsync(`
        CREATE TABLE favorites (
          id TEXT PRIMARY KEY,
          ingredient_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE,
          UNIQUE(ingredient_id)
        );
      `);
      console.log('✅ Favorites table created successfully');

      // Verify the table was created
      const favTableInfo = await db.getAllAsync('PRAGMA table_info(favorites)');
      console.log('Favorites table schema:', favTableInfo);

    } catch (error) {
      console.error('Error creating favorites table:', error);
      throw error;
    }

    // Create indexes
    try {
      console.log('Creating indexes...');
      console.log('Creating index on ingredients.category...');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);');
      console.log('Creating index on ingredients.name...');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);');
      console.log('Creating index on ingredients.is_user_created...');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_ingredients_user_created ON ingredients(is_user_created);');
      console.log('Creating index on favorites.ingredient_id...');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_favorites_ingredient_id ON favorites(ingredient_id);');
      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }

    // Create trigger
    try {
      console.log('Creating update trigger...');
      await db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS update_ingredients_updated_at
          AFTER UPDATE ON ingredients
          BEGIN
            UPDATE ingredients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
      `);
      console.log('✅ Update trigger created successfully');
    } catch (error) {
      console.error('Error creating trigger:', error);
      throw error;
    }

    console.log('✅ Database tables created successfully');

    // Seed database with XML data on first creation
    await seedDatabaseWithXML(db);

  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

// Function to seed database with XML ingredient data
const seedDatabaseWithXML = async (db: SQLiteDatabase): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding with XML data...');

    // Check if ingredients already exist to avoid duplicate seeding
    const existingCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM ingredients') as { count: number } | null;
    if (existingCount && existingCount.count > 0) {
      console.log(`Database already contains ${existingCount.count} ingredients, skipping seeding`);
      return;
    }

    // Load ingredients from XML files
    const ingredients = await xmlDataLoader.loadIngredientsFromAssets();

    if (ingredients.length === 0) {
      console.warn('No ingredients loaded from XML files');
      return;
    }

    // Use repository to bulk insert ingredients
    // Note: We need to create a temporary repository instance
    // In a more sophisticated setup, we'd inject this dependency
    const tempRepository = new IngredientRepository();
    await tempRepository.bulkInsert(ingredients);

    console.log(`✅ Database seeded successfully with ${ingredients.length} ingredients`);

  } catch (error) {
    console.error('❌ Error seeding database with XML data:', error);
    // Don't throw here - we want database creation to succeed even if seeding fails
    console.log('Database creation will continue without seeding');
  }
};

export const migrateDatabase = async (db: SQLiteDatabase, currentVersion: number): Promise<void> => {
  try {
    console.log(`Migrating database from version ${currentVersion} to ${DATABASE_VERSION}`);

    // For any version less than 2, we need to recreate the tables
    // This handles both new installations and upgrades from old schemas
    if (currentVersion < 2) {
      console.log('Running migration to version 2 - recreating tables with proper schema...');

      // First, try to backup any existing data if the ingredients table exists
      let existingIngredients: any[] = [];
      let existingFavorites: any[] = [];

      try {
        // Check if tables exist and try to backup data
        const tables = await db.getAllAsync(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name IN ('ingredients', 'favorites')
        `);

        const tableNames = (tables as any[]).map(t => t.name);

        if (tableNames.includes('ingredients')) {
          try {
            existingIngredients = await db.getAllAsync('SELECT * FROM ingredients') as any[];
            console.log(`Backing up ${existingIngredients.length} existing ingredients`);
          } catch (error) {
            console.log('Could not backup ingredients, they may not exist or have different schema');
          }
        }

        if (tableNames.includes('favorites')) {
          try {
            existingFavorites = await db.getAllAsync('SELECT * FROM favorites') as any[];
            console.log(`Backing up ${existingFavorites.length} existing favorites`);
          } catch (error) {
            console.log('Could not backup favorites, they may not exist or have different schema');
          }
        }
      } catch (error) {
        console.log('No existing data to backup or backup failed');
      }

      // Drop existing tables and create new ones
      await dropTables(db);
      await createTables(db);

      // Restore backed up data if possible and it matches the new schema
      if (existingIngredients.length > 0) {
        try {
          console.log('Attempting to restore existing ingredients...');
          for (const ingredient of existingIngredients) {
            // Only restore if the data has required columns
            if (ingredient.id && ingredient.name && ingredient.category && ingredient.subcategory) {
              await db.runAsync(`
                INSERT OR IGNORE INTO ingredients (
                  id, name, category, subcategory, units,
                  seasonal_months, seasonal_peak_months, seasonal_season,
                  is_user_created, description, tags, notes,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                ingredient.id,
                ingredient.name,
                ingredient.category,
                ingredient.subcategory,
                ingredient.units || '[]',
                ingredient.seasonal_months || null,
                ingredient.seasonal_peak_months || null,
                ingredient.seasonal_season || null,
                ingredient.is_user_created || 0,
                ingredient.description || null,
                ingredient.tags || null,
                ingredient.notes || null,
                ingredient.created_at || new Date().toISOString(),
                ingredient.updated_at || new Date().toISOString()
              ]);
            }
          }
          console.log('Successfully restored existing ingredients');
        } catch (error) {
          console.log('Could not restore ingredients, but new schema is ready');
        }
      }

      if (existingFavorites.length > 0) {
        try {
          console.log('Attempting to restore existing favorites...');
          for (const favorite of existingFavorites) {
            if (favorite.id && favorite.ingredient_id) {
              await db.runAsync(`
                INSERT OR IGNORE INTO favorites (id, ingredient_id, created_at)
                VALUES (?, ?, ?)
              `, [
                favorite.id,
                favorite.ingredient_id,
                favorite.created_at || new Date().toISOString()
              ]);
            }
          }
          console.log('Successfully restored existing favorites');
        } catch (error) {
          console.log('Could not restore favorites, but new schema is ready');
        }
      }
    }

    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
};

export const dropTables = async (db: SQLiteDatabase): Promise<void> => {
  try {
    console.log('Dropping existing database structures...');

    // Drop trigger first
    try {
      await db.execAsync('DROP TRIGGER IF EXISTS update_ingredients_updated_at;');
      console.log('Dropped trigger update_ingredients_updated_at');
    } catch (error) {
      console.log('Trigger drop failed (may not exist):', error);
    }

    // Drop indexes
    try {
      await db.execAsync('DROP INDEX IF EXISTS idx_favorites_ingredient_id;');
      await db.execAsync('DROP INDEX IF EXISTS idx_ingredients_user_created;');
      await db.execAsync('DROP INDEX IF EXISTS idx_ingredients_name;');
      await db.execAsync('DROP INDEX IF EXISTS idx_ingredients_category;');
      console.log('Dropped all indexes');
    } catch (error) {
      console.log('Some indexes drop failed (may not exist):', error);
    }

    // Drop tables
    try {
      await db.execAsync('DROP TABLE IF EXISTS favorites;');
      console.log('Dropped favorites table');
    } catch (error) {
      console.log('Favorites table drop failed (may not exist):', error);
    }

    try {
      await db.execAsync('DROP TABLE IF EXISTS ingredients;');
      console.log('Dropped ingredients table');
    } catch (error) {
      console.log('Ingredients table drop failed (may not exist):', error);
    }

    // Verify tables are gone
    const remainingTables = await db.getAllAsync(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('ingredients', 'favorites')
    `);

    if ((remainingTables as any[]).length > 0) {
      console.log('Warning: Some tables still exist:', remainingTables);
    } else {
      console.log('✅ All tables successfully dropped');
    }

    console.log('Database tables dropped successfully');
  } catch (error) {
    console.error('Error dropping database tables:', error);
    throw error;
  }
};

// Development utility function to completely reset the database
export const resetDatabaseForDevelopment = async (db: SQLiteDatabase): Promise<void> => {
  try {
    console.log('🔄 Resetting database for development...');
    
    // Drop all tables
    await dropTables(db);
    
    // Reset database version to 0
    await db.execAsync('PRAGMA user_version = 0');
    
    // Recreate tables and seed with XML data
    await createTables(db);
    
    // Update version to current
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    
    console.log('✅ Database reset completed successfully');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
};
