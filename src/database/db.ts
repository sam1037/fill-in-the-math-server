import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import pg from 'pg';
const { Pool } = pg;

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine if running in test environment
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.CI === 'true';

// Define database configuration based on environment
const dbConfig = {
  // For GitHub Actions or test environments without .env
  connectionString:
    process.env.DATABASE_URL ||
    (isTestEnvironment
      ? 'postgresql://postgres:postgres@localhost:5432/test_db'
      : undefined),
  ssl: !isTestEnvironment
    ? {
        rejectUnauthorized: true, // Required for Neon/Supabase
      }
    : false, // Disable SSL for local testing
  max: 5,
};

// Create a new Pool instance with connection details
const pool = new Pool(dbConfig);

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
