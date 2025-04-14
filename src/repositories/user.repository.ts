// src/repositories/user.repository.ts
import pool, { query } from '../database/db.js';
import { User, CreateUserDto, UpdateUserDto } from '../types/db.types.js';
import { QueryResult } from 'pg';

/**
 * Repository for managing User data in the database
 */
export const UserRepository = {
  //find all users, return a promise of an array of User(s)
  async findAll(): Promise<User[]> {
    const result: QueryResult<User> = await query(
      'SELECT * FROM users ORDER BY user_id',
      []
    );
    return result.rows as User[];
  },

  /**
   * Find a user by ID
   * @param userId The user ID to look up
   */
  async findById(userId: number): Promise<User | null> {
    const result: QueryResult<User> = await query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new user
   * @param user The user data to insert
   */
  async create(user: CreateUserDto): Promise<User> {
    const result = await query<User>(
      'INSERT INTO users (username, email, password_hash, profile_picture, user_type, experience) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        user.username,
        user.email,
        user.password_hash,
        user.profile_picture,
        user.user_type,
        user.experience,
      ]
    );
    return result.rows[0];
  },

  //update an existing user
  async update(
    userId: number,
    updateData: UpdateUserDto
  ): Promise<User | null> {
    try {
      // Filter out undefined values
      const entries = Object.entries(updateData);

      // If nothing to update, return the current user
      if (entries.length === 0) {
        return await UserRepository.findById(userId);
      }

      // Build SET part of the query dynamically
      const setClauses = entries.map(
        ([key], index) => `${key} = $${index + 1}`
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const values = entries.map(([_key, value]) => value);

      // Add userId as the last parameter
      values.push(userId);

      // Construct the full query
      const query = `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = $${values.length} RETURNING *`;

      // Execute the query
      const result: QueryResult<User> = await pool.query(query, values);

      return result.rows[0] || null;
    } catch (error: unknown) {
      console.error(`Error updating user with ID ${userId}:`, error);
      throw error;
    }
  },

  //delete an user by user id
  async delete(userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
        [userId]
      );
      // Return true if a record was deleted, false otherwise
      return (result.rowCount ?? 0) > 0;
    } catch (error: unknown) {
      console.error(`Error deleting user with ID ${userId}:`, error);
      throw error;
    }
  },

  //find a user by email
  async findByEmail(email: string): Promise<User | null> {
    const result: QueryResult<User> = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },
};

export default UserRepository;
