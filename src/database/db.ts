import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new Pool instance with connection details from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true, // Required for Neon/Supabase
  },
  max: 5,
});

// Add error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// transaction
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Query function to execute SQL queries
// TODO check security of this function, SQL injection?
export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool;
