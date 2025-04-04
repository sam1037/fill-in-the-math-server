import pool from '../../src/database/db.js';
import UserRepository from '../../src/repositories/user.repository.js';
import { seedUsers } from '../../src/database/seed.js';
import { PoolClient } from 'pg';
import { resetDatabase } from '../../src/database/setup.js';
import {
  CreateUserDto,
  UserType,
  UpdateUserDto,
} from '../../src/types/db.types.js';

describe('User Repository', () => {
  let client: PoolClient;

  beforeEach(async () => {
    // Begin transaction
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    // Rollback transaction after each test
    await client.query('ROLLBACK');
    client.release();
  });

  // Set up once before all tests
  beforeAll(async () => {
    await resetDatabase();
    await seedUsers();
  });

  // Clean up after all tests
  afterAll(async () => {
    await pool.end();
  });

  test('should find all users', async () => {
    // Arrange & Act
    const users = await UserRepository.findAll(client);

    console.log('Users:', users); // Debugging line to check the output

    // Assert
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);

    // Check if the users have the expected properties
    const firstUser = users[0];
    expect(firstUser).toHaveProperty('user_id');
    expect(firstUser).toHaveProperty('username');
    expect(firstUser).toHaveProperty('email');
  });

  test('should find a user by ID', async () => {
    // Arrange - First get a valid user ID from the database
    const allUsers = await UserRepository.findAll(client);
    const testUserId = allUsers[0].user_id;

    // Act - Find that specific user
    const foundUser = await UserRepository.findById(testUserId, client);

    // Assert
    expect(foundUser).toBeDefined();
    expect(foundUser).not.toBeNull();
    expect(foundUser?.user_id).toBe(testUserId);
  });

  test('should return null when finding a non-existent user ID', async () => {
    // Act - Try to find a user with an ID that shouldn't exist
    const nonExistentId = 9999;
    const foundUser = await UserRepository.findById(nonExistentId, client);

    // Assert
    expect(foundUser).toBeNull();
  });

  test('should create a new user', async () => {
    // Arrange
    const newUser: CreateUserDto = {
      username: 'testuser123',
      email: 'test123@example.com',
      password_hash:
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // SHA-256 of '123'
      current_ranking_score: 100,
      profile_picture: null,
      user_type: 'Player' as UserType, // Use the correct literal from your type
    };

    // Act
    const createdUser = await UserRepository.create(newUser, client);

    // Assert
    expect(createdUser).toBeDefined();
    expect(createdUser.user_id).toBeDefined();
    expect(createdUser.username).toBe(newUser.username);
    expect(createdUser.email).toBe(newUser.email);
    expect(createdUser.user_type).toBe(newUser.user_type);

    // Verify it was actually saved to the database
    const foundUser = await UserRepository.findById(
      createdUser.user_id,
      client
    );
    expect(foundUser).not.toBeNull();
    expect(foundUser?.username).toBe(newUser.username);
  });

  test('should update an existing user', async () => {
    //skip for now
    // Arrange
    // First create a user that we will update
    const newUser: CreateUserDto = {
      username: 'update_test_user',
      email: 'update@example.com',
      password_hash:
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      current_ranking_score: 50,
      profile_picture: null,
      user_type: 'Player' as UserType,
    };

    const createdUser = await UserRepository.create(newUser, client);

    // Define the updates we want to make
    const updates: UpdateUserDto = {
      username: 'updated_username',
      current_ranking_score: 150,
      profile_picture: '/profiles/updated.png',
    };

    // Act
    const updatedUser = await UserRepository.update(
      createdUser.user_id,
      updates,
      client
    );

    // Assert
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.username).toBe(updates.username);
    expect(updatedUser?.current_ranking_score).toBe(
      updates.current_ranking_score
    );
    expect(updatedUser?.profile_picture).toBe(updates.profile_picture);
    expect(updatedUser?.email).toBe(newUser.email); // Should remain unchanged

    // Verify changes are persisted in the database
    const foundUser = await UserRepository.findById(
      createdUser.user_id,
      client
    );
    expect(foundUser?.username).toBe(updates.username);
    expect(foundUser?.current_ranking_score).toBe(
      updates.current_ranking_score
    );
  });

  test('should return null when updating non-existent user', async () => {
    // Arrange
    const nonExistentId = 9999;
    const updates = {
      username: 'this_wont_work',
      email: 'nonexistent@example.com',
    };

    // Act
    const result = await UserRepository.update(nonExistentId, updates, client);

    // Assert
    expect(result).toBeNull();
  });

  test('should delete an existing user', async () => {
    // Arrange
    // First create a user to delete
    const userToDelete: CreateUserDto = {
      username: 'delete_me_user',
      email: 'delete@example.com',
      password_hash:
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      current_ranking_score: 10,
      profile_picture: null,
      user_type: 'Player' as UserType,
    };

    const createdUser = await UserRepository.create(userToDelete, client);

    // Act
    const deleteResult = await UserRepository.delete(
      createdUser.user_id,
      client
    );

    // Assert
    expect(deleteResult).toBe(true);

    // Verify the user no longer exists
    const foundUser = await UserRepository.findById(
      createdUser.user_id,
      client
    );
    expect(foundUser).toBeNull();
  });

  test('should return false when deleting non-existent user', async () => {
    // Arrange
    const nonExistentId = 9999;

    // Act
    const deleteResult = await UserRepository.delete(nonExistentId, client);

    // Assert
    expect(deleteResult).toBe(false);
  });

  test('should handle partial updates correctly', async () => {
    // Arrange
    // Create a user with complete data
    const completeUser: CreateUserDto = {
      username: 'partial_update_user',
      email: 'partial@example.com',
      password_hash:
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      current_ranking_score: 75,
      profile_picture: '/profiles/original.png',
      user_type: 'Host' as UserType,
    };

    const createdUser = await UserRepository.create(completeUser, client);

    // Act - Only update one field
    const partialUpdate: UpdateUserDto = {
      current_ranking_score: 100,
      // Only updating the score, other fields should remain unchanged
    };

    const updatedUser = await UserRepository.update(
      createdUser.user_id,
      partialUpdate,
      client
    );

    // Assert
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.current_ranking_score).toBe(100); // Should be updated
    expect(updatedUser?.username).toBe(completeUser.username); // Should remain unchanged
    expect(updatedUser?.email).toBe(completeUser.email); // Should remain unchanged
    expect(updatedUser?.profile_picture).toBe(completeUser.profile_picture); // Should remain unchanged
    expect(updatedUser?.user_type).toBe(completeUser.user_type); // Should remain unchanged
  });
});
