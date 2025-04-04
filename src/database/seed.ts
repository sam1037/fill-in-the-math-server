console.log('Seeding database...');

import pool from './db.js';

async function seedDatabase() {
  try {
    console.log('Connecting to the database...');
    const query = 'SELECT * FROM my_table';
    const res = await pool.query(query);
    console.log('Query executed successfully:', res.rows);
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return;
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

seedDatabase();
