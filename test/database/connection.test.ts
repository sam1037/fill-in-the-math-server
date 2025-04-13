import { PoolClient } from 'pg';
import pool, { withTransaction } from '../../src/database/db.js';

describe('PostgreSQL Connection and withTransaction', () => {
  // Close the pool after all tests complete
  afterAll(async () => {
    await pool.end();
    console.log('Database connection closed.');
  });

  // test connect to db and execute a query
  it('should connect the the db and excecute a query', async () => {
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      const query =
        'SELECT current_database() AS database_name, current_user AS user_name';
      const res = await pool.query(query);
      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThan(0);
      console.log('Query executed successfully:', res.rows);
      await client.query('COMMIT');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  it('should be able to run query using withTransaction', async () => {
    const testData = { id: 1, value: 'test' };

    // Create a temporary table for testing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY,
        value VARCHAR(255)
      );
    `);

    // Function to insert data within a transaction
    const insertData = async (client: PoolClient) => {
      await client.query('INSERT INTO test_table (id, value) VALUES ($1, $2)', [
        testData.id,
        testData.value,
      ]);
    };

    // Execute the insertData function within a transaction
    await withTransaction(insertData);

    // Verify that the data was inserted
    const result = await pool.query('SELECT * FROM test_table WHERE id = $1', [
      testData.id,
    ]);
    expect(result.rows).toEqual([testData]);

    // Clean up the temporary table
    await pool.query('DROP TABLE test_table');
  });
});
