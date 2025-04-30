import UserService, {
  RegistrationData,
} from '../../src/services/user-service.js';
import { UserRepository } from '../../src/repositories/user.repository.js';
import pool from '../../src/database/db.js';
import { User } from '../../src/types/db.types.js';
import { seedUsers } from '../../src/database/seed.js';
import { resetDatabase } from '../../src/database/setup.js';

describe('UserService', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  //reset and seed the db b4 each test
  beforeEach(async () => {
    //await resetDatabase();
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
    profile_picture: null,
    user_type: 'Player',
    experience: 0,
  };

  const mockLoginCredentials = {
    email: 'test@example.com',
    password: 'password',
  };

  it('should successfully verify login and return user info without password hash', async () => {
    // Arrange
    // Ensure the mockUser exists in the database
    const registerData: RegistrationData = {
      email: mockUser.email,
      username: mockUser.username,
      password: 'password', // Use a known password
    };
    await UserService.registerUser(registerData);

    // Act
    const result = await UserService.verifyLogin(mockLoginCredentials);

    // Assert
    expect(result.success).toBe(true);
  });

  it('should successfully register a new user if given valid information', async () => {
    //arrange: prepare the data needed for registration
    const registerData: RegistrationData = {
      email: 'dummy.email123@gamil.com',
      username: 'dummyForTestingRegistration',
      password: 'dummy123pw',
    };
    //act: use the function in user service to create the new dummy user
    const result = await UserService.registerUser(registerData);
    //assert: check valid
    expect(result.success).toBe(true);
  });
  it('should return error if email is already registered', () => {
    console.log('TODO');
  });
  it('should return error if username is already used', () => {
    console.log('TODO');
  });

  it('should handle updating user expereince sucessfully', async () => {
    //arrange: add a dummy user to the Users table in db
    const initExp = 0;
    const registerData: RegistrationData = {
      email: 'exp.test@gamil.com',
      username: 'expTestUser',
      password: 'expTestPassword',
    };
    const registrationResult = await UserService.registerUser(registerData);
    expect(registrationResult.success).toBe(true);

    const user = await UserRepository.findByEmail(registerData.email);
    expect(user).toBeDefined();

    //act: update the exp of the dummy user and see if valid
    expect(user?.experience).toBeDefined();
    expect(user?.experience).toEqual(initExp);
    const experienceGained = 50;
    if (user) {
      await UserService.increaseUserExp(user.user_id, experienceGained);
      //assert: check if exp match
      const updatedUser = await UserRepository.findByEmail(registerData.email);
      expect(updatedUser).toBeDefined();
      if (updatedUser) {
        expect(updatedUser.experience).toBe(initExp + experienceGained);
      }
    }
  });
});
