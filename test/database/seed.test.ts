import pool from '../../src/database/db.js';
import { seedUsers } from '../../src/database/seed.js';

describe('Database Seeding', () => {
  // Clean up data before and after tests
  beforeAll(async () => {
    await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  test('should seed users successfully', async () => {
    await seedUsers();

    // Check if users were created
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt((result.rows[0] as { count: string }).count, 10);
    expect(count).toBeGreaterThan(0);
  });

  test('should create different user types', async () => {
    // Reset users first
    await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
    await seedUsers();

    // Check if we have different user types
    const result = await pool.query('SELECT DISTINCT user_type FROM users');
    expect(result.rows.length).toBeGreaterThanOrEqual(2); // At least 2 different types
  });
});
