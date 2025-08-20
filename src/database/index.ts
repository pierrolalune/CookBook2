import { SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';
import { createTables, DATABASE_NAME } from './schema';

let db: SQLiteDatabase | null = null;

export const initializeDatabase = async (): Promise<SQLiteDatabase> => {
  try {
    if (db) {
      return db;
    }

    console.log('Initializing database...');
    db = openDatabaseSync(DATABASE_NAME);
    
    await createTables(db);
    console.log('Database initialized successfully');
    
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