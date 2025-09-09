// Temporary script to reset the database
// Run this with: node resetDB.js

const { openDatabaseSync } = require('expo-sqlite');

const DATABASE_NAME = 'cookbook.db';

async function resetDatabase() {
  console.log('🧹 [DB] Resetting database...');
  
  try {
    const db = openDatabaseSync(DATABASE_NAME);
    
    // Drop tables in correct order (due to foreign key constraints)
    await db.execAsync('DROP TABLE IF EXISTS shopping_list_items;');
    await db.execAsync('DROP TABLE IF EXISTS shopping_lists;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_favorites;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_photos;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_usage;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_instructions;');
    await db.execAsync('DROP TABLE IF EXISTS recipe_ingredients;');
    await db.execAsync('DROP TABLE IF EXISTS recipes;');
    await db.execAsync('DROP TABLE IF EXISTS favorites;');
    await db.execAsync('DROP TABLE IF EXISTS ingredients;');
    
    console.log('✅ [DB] Database reset complete');
    
    await db.closeAsync();
  } catch (error) {
    console.error('❌ [DB] Database reset failed:', error);
  }
}

resetDatabase();