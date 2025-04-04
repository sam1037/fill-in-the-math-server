import pool from '../../src/database/db.js';

describe('PostgreSQL Connection', () => {
  // Close the pool after all tests complete
  afterAll(async () => {
    await pool.end();
    console.log('Database connection closed.');
  });

  it('should connect to the database and execute a query', async () => {
    try {
      console.log('Connecting to the database...');
      // Query the system catalog instead of assuming a specific table exists
      const query =
        'SELECT current_database() AS database_name, current_user AS user_name';
      const res = await pool.query(query);
      console.log('Query executed successfully:', res.rows);
      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThan(0);
      console.log('Database connection successful.');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      throw error;
    }
  });
});
