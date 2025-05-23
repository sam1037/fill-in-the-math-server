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
  //let transactionClient: PoolClient;

  beforeAll(async () => {
    await resetDatabase();
    await seedUsers();
    // Create and store a dedicated transaction client
    //transactionClient = await pool.connect();
    //await transactionClient.query('BEGIN');
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
    // Create a savepoint on the same transaction client
    //await transactionClient.query('SAVEPOINT test_savepoint');
    client = await pool.connect();
  });

  afterEach(() => {
    client.release();
    // Rollback to the savepoint on the same client
    //await transactionClient.query('ROLLBACK TO SAVEPOINT test_savepoint');
  });

  afterAll(async () => {
    // Rollback the entire transaction and release the client
    //await transactionClient.query('ROLLBACK');
    //transactionClient.release();
    await pool.end();
  });

  test('should be able to find user by email', async () => {
    // Arrange
    // Seed users already creates a user with email admin@fillmath.com
    const testEmail = 'admin@fillmath.com';

    // Act
    const foundUser = await UserRepository.findByEmail(testEmail);

    // Assert
    expect(foundUser).toBeDefined();
    expect(foundUser).not.toBeNull();
    expect(foundUser?.email).toBe(testEmail);
  });

  test('should find all users', async () => {
    // Arrange & Act
    const users = await UserRepository.findAll();

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
    const allUsers = await UserRepository.findAll();
    const testUserId = allUsers[0].user_id;

    // Act - Find that specific user
    const foundUser = await UserRepository.findById(testUserId);

    // Assert
    expect(foundUser).toBeDefined();
    expect(foundUser).not.toBeNull();
    expect(foundUser?.user_id).toBe(testUserId);
  });

  test('should return null when finding a non-existent user ID', async () => {
    // Act - Try to find a user with an ID that shouldn't exist
    const nonExistentId = 9999;
    const foundUser = await UserRepository.findById(nonExistentId);

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
      profile_picture: null,
      user_type: 'Player' as UserType, // Use the correct literal from your type
      experience: 1,
    };

    // Log the current db state before adding new user, TODO to delete
    //const allUsers = await UserRepository.findAll();
    //console.log(
    //  'Users before creation:',
    //  allUsers.map((u) => u.username)
    //);

    // Act
    const createdUser = await UserRepository.create(newUser);

    // Assert
    expect(createdUser).toBeDefined();
    expect(createdUser.user_id).toBeDefined();
    expect(createdUser.username).toBe(newUser.username);
    expect(createdUser.email).toBe(newUser.email);
    expect(createdUser.user_type).toBe(newUser.user_type);

    // Verify it was actually saved to the database
    const foundUser = await UserRepository.findById(createdUser.user_id);
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
      profile_picture: null,
      user_type: 'Player' as UserType,
      experience: 1,
    };

    // Log the current db state before adding new user, TODO to delete
    const allUsers = await UserRepository.findAll();
    console.log(
      'Users before creation:',
      allUsers.map((u) => u.username)
    );

    const createdUser = await UserRepository.create(newUser);

    // Define the updates we want to make
    const updates: UpdateUserDto = {
      username: 'updated_username',
      profile_picture: 3,
    };

    // Act
    const updatedUser = await UserRepository.update(
      createdUser.user_id,
      updates
    );

    // Assert
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.username).toBe(updates.username);
    expect(updatedUser?.profile_picture).toBe(updates.profile_picture);
    expect(updatedUser?.email).toBe(newUser.email); // Should remain unchanged

    // Verify changes are persisted in the database
    const foundUser = await UserRepository.findById(createdUser.user_id);
    expect(foundUser?.username).toBe(updates.username);
  });

  test('should return null when updating non-existent user', async () => {
    // Arrange
    const nonExistentId = 9999;
    const updates = {
      username: 'this_wont_work',
      email: 'nonexistent@example.com',
    };

    // Act
    const result = await UserRepository.update(nonExistentId, updates);

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
      profile_picture: null,
      user_type: 'Player' as UserType,
      experience: 1,
    };

    const createdUser = await UserRepository.create(userToDelete);

    // Act
    const deleteResult = await UserRepository.delete(createdUser.user_id);

    // Assert
    expect(deleteResult).toBe(true);

    // Verify the user no longer exists
    const foundUser = await UserRepository.findById(createdUser.user_id);
    expect(foundUser).toBeNull();
  });

  test('should return false when deleting non-existent user', async () => {
    // Arrange
    const nonExistentId = 9999;

    // Act
    const deleteResult = await UserRepository.delete(nonExistentId);

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
      profile_picture: 2,
      user_type: 'Host' as UserType,
      experience: 1,
    };

    const createdUser = await UserRepository.create(completeUser);

    // Act - Only update one field
    const partialUpdate: UpdateUserDto = {
      profile_picture: 4,
      // Only updating the score, other fields should remain unchanged
    };

    const updatedUser = await UserRepository.update(
      createdUser.user_id,
      partialUpdate
    );

    // Assert
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.profile_picture).toBe(partialUpdate.profile_picture); // Should be updated from 2 to 4
    expect(updatedUser?.username).toBe(completeUser.username); // Should remain unchanged
    expect(updatedUser?.email).toBe(completeUser.email); // Should remain unchanged
    expect(updatedUser?.user_type).toBe(completeUser.user_type); // Should remain unchanged
  });
});
