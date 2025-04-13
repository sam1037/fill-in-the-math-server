// src/database/setup.ts
import fs from 'node:fs';
import path from 'node:path';
import pool from './db.js';

// Get the project root directory
const projectRoot = process.cwd();

// Function to set up the database schema
export async function setupDatabase() {
  try {
    console.log('Setting up database schema...');

    // Read the schema file
    const schemaPath = path.join(projectRoot, 'src', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema SQL
    await pool.query(schemaSql);

    console.log('Database schema created successfully');
    return true;
  } catch (error) {
    console.error('Error setting up database schema:', error);
    throw error;
  }
}

// Function to drop all tables (useful for testing)
export async function dropAllTables() {
  try {
    console.log('Dropping all tables...');

    // Drop tables in the correct order (respecting foreign key constraints)
    await pool.query(`
      DROP TABLE IF EXISTS users CASCADE;
      -- Add other tables here as the schema grows
    `);

    console.log('All tables dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
}

// Reset database (drop and recreate)
export async function resetDatabase() {
  try {
    await dropAllTables();
    await setupDatabase();
    console.log('Database reset completed successfully');
    return true;
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  } finally {
    // Don't close the pool here if this might be used programmatically
    // If running as standalone script, close it in the main execution block
  }
}

// equivalent to "if __name__ == '__main__': (probably)"
function isRunningDirectly() {
  return process.argv[1]?.endsWith('setup.ts');
}

if (isRunningDirectly()) {
  console.log('Running setup script directly...');
  // This is the main module being executed directly
  resetDatabase()
    .then(() => {
      console.log('Database setup complete.');
      pool.end();
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('Database setup failed:', err);
      pool.end();
      process.exit(1);
    });
}
