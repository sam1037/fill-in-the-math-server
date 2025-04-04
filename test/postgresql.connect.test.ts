import pool from '../database/db.js';

describe('PostgreSQL Connection', () => {
  // Close the pool after all tests complete
  afterAll(async () => {
    await pool.end();
    console.log('Database connection closed.');
  }, 10000); // 10 seconds timeout

  it('should connect to the database and execute a query', async () => {
    try {
      console.log('Connecting to the database...');
      const query = 'SELECT * FROM test_table';
      const res = await pool.query(query);
      console.log('Query executed successfully:', res.rows);
      expect(res.rows).toBeDefined();
      console.log('Database connection successful.');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      throw error;
    }
  });
});
