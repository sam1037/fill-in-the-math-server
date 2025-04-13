// src/repositories/user.repository.ts
import pool, { query } from '../database/db.js';
import { User, CreateUserDto, UpdateUserDto } from '../types/db.types.js';
import { QueryResult, PoolClient } from 'pg';

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
  oldfindById: async (
    userId: number,
    client?: PoolClient
  ): Promise<User | null> => {
    const queryRunner = client || pool;
    const result: QueryResult<User> = await queryRunner.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async findById(userId: number): Promise<User | null> {
    const result: QueryResult<User> = await query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   *Create a new user
   *@param user The user data to insert
   *@param client Optional database client for transaction support
   */
  oldCreate: async (
    user: CreateUserDto,
    client?: PoolClient
  ): Promise<User> => {
    // Use provided client or fallback to pool
    const queryRunner = client || pool;
    const result: QueryResult<User> = await queryRunner.query(
      'INSERT INTO users (username, email, password_hash, current_ranking_score, profile_picture, user_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        user.username,
        user.email,
        user.password_hash,
        user.current_ranking_score,
        user.profile_picture,
        user.user_type,
      ]
    );
    return result.rows[0];
  },

  /**
   * Create a new user
   * @param user The user data to insert
   */
  async create(user: CreateUserDto): Promise<User> {
    const result = await query<User>(
      'INSERT INTO users (username, email, password_hash, current_ranking_score, profile_picture, user_type, experience) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        user.username,
        user.email,
        user.password_hash,
        user.current_ranking_score,
        user.profile_picture,
        user.user_type,
        user.experience,
      ]
    );
    return result.rows[0];
  },

  /**
   * Update an existing user
   * @param userId The ID of the user to update
   * @param user The new user data
   * @param client Optional database client for transaction support
   */
  oldUpdate: async (
    userId: number,
    updateData: UpdateUserDto,
    client?: PoolClient
  ): Promise<User | null> => {
    // Use provided client or fallback to pool
    const queryRunner = client || pool;

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
      const result: QueryResult<User> = await queryRunner.query(query, values);

      return result.rows[0] || null;
    } catch (error: unknown) {
      console.error(`Error updating user with ID ${userId}:`, error);
      throw error;
    }
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

  /**
   * Delete a user by ID
   * @param userId The ID of the user to delete
   * @param client Optional database client for transaction support
   */
  oldDelete: async (userId: number, client?: PoolClient): Promise<boolean> => {
    const queryRunner = client || pool;
    try {
      const result = await queryRunner.query(
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

  /**
   * Find a user by email
   * @param email The user email to look up
   * @param client Optional database client for transaction support
   */
  oldFindByEmail: async (
    email: string,
    client?: PoolClient
  ): Promise<User | null> => {
    // Use provided client or fallback to pool
    const queryRunner = client || pool;
    const result: QueryResult<User> = await queryRunner.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  //find user by email
  async findByEmail(email: string): Promise<User | null> {
    const result: QueryResult<User> = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },
};

export default UserRepository;
