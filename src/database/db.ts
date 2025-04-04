import pg from 'pg';
const { Pool } = pg;
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
