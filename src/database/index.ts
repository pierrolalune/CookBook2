import { SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';
import { createTables, DATABASE_NAME, DATABASE_VERSION, migrateDatabase } from './schema';

let db: SQLiteDatabase | null = null;

export const initializeDatabase = async (): Promise<SQLiteDatabase> => {
  try {
    if (db) {
      return db;
    }

    console.log('Initializing database...');
    db = openDatabaseSync(DATABASE_NAME);
    
    // Check current database version
    let currentVersion = 0;
    let needsFullReset = false;
    
    try {
      const result = await db.getFirstAsync('PRAGMA user_version') as { user_version: number } | null;
      currentVersion = result?.user_version || 0;
      
      // Check if ingredients table exists and has the required columns
      if (currentVersion === 0 || currentVersion < DATABASE_VERSION) {
        try {
          // Try to check if the table structure is correct
          const tableInfo = await db.getAllAsync('PRAGMA table_info(ingredients)');
          const columns = (tableInfo as any[]).map((col: any) => col.name);
          
          if (!columns.includes('category') || !columns.includes('subcategory')) {
            console.log('Existing table structure is outdated, forcing full reset');
            needsFullReset = true;
          }
        } catch (schemaError) {
          console.log('Could not check table schema, assuming new database');
          needsFullReset = false;
        }
      }
    } catch (error) {
      console.log('Database version check failed, treating as new database');
      currentVersion = 0;
      needsFullReset = false;
    }
    
    console.log(`Current database version: ${currentVersion}, Target version: ${DATABASE_VERSION}`);
    
    if (currentVersion === 0 && !needsFullReset) {
      // Truly new database - create tables
      console.log('Creating fresh database with new schema');
      await createTables(db);
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    } else if (currentVersion < DATABASE_VERSION || needsFullReset) {
      // Existing database needs migration or full reset
      console.log(needsFullReset ? 'Performing full database reset due to schema mismatch' : 'Performing database migration');
      await migrateDatabase(db, currentVersion);
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }
    
    console.log('✅ Database initialization completed successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
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
    console.log('Database closed');
  }
};

// Utility function to check if database is initialized
export const isDatabaseInitialized = (): boolean => {
  return db !== null;
};