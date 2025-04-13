import UserService from '../../src/services/user-service.js';
import { UserRepository } from '../../src/repositories/user.repository.js';
import bcrypt from 'bcrypt';
import pool from '../../src/database/db.js';
import { User } from '../../src/types/db.types.js';
import { seedUsers } from '../../src/database/seed.js';
import { resetDatabase } from '../../src/database/setup.js';

jest.mock('../../src/repositories/user.repository');
jest.mock('bcrypt');

describe('UserService', () => {
  //reset and seed the db b4 each test
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  afterAll(async () => {
    await pool.end();
    console.log('Database connection closed.');
  });

  const mockUser: User = {
    user_id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    date_registered: new Date(),
    current_ranking_score: 0,
    profile_picture: null,
    user_type: 'Player',
    experience: 0,
  };

  const mockLoginCredentials = {
    email: 'test@example.com',
    password: 'password',
  };

  it('should successfully verify login and return user info without password hash', async () => {
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await UserService.verifyLogin(mockLoginCredentials);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Login successful');
    expect(result.user).toBeDefined();
    expect(result.user).not.toHaveProperty('password_hash'); // Ensure password_hash is excluded
    expect(result.user).toEqual({
      user_id: mockUser.user_id,
      username: mockUser.username,
      email: mockUser.email,
      date_registered: mockUser.date_registered,
      current_ranking_score: mockUser.current_ranking_score,
      profile_picture: mockUser.profile_picture,
      user_type: mockUser.user_type,
      experience: mockUser.experience,
    });
  });
});
