import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new Pool instance with connection details from environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Test the connection
pool
  .connect()
  .then((client) => {
    console.log('Connected to the database successfully');
    // Return the client to the pool
    client.release();
  })
  .catch((err: unknown) => {
    console.error('Database connection error:', err);
  });

// Add error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Query function to execute SQL queries
// TODO check security of this function, SQL injection?
export const query = (text: string, params?: unknown[]) => {
  return pool.query(text, params);
};

export default pool;
