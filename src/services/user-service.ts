// src/services/user.service.ts

import bcrypt, { compare } from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserType,
} from '../types/db.types.js';
import { calculateLevel } from '../utils/user-level-calculator.js';

/**
 * Represents the structure of user login credentials.
 */
interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Represents the result object returned by the login verification process.
 */
interface LoginResult {
  success: boolean;
  message: string;
  user?: Omit<User, 'password_hash'>; // Use Omit to exclude password_hash
}

/**
 * Represents the data required to register a new user.
 */
export interface RegistrationData {
  email: string;
  username: string;
  password: string;
}

/**
 * Service for user-related business logic
 */
export const UserService = {
  /**
   * Verify user login credentials
   * @param credentials The email and password to verify
   * @returns Login result with success status, message, and user info if successful
   */
  verifyLogin: async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      // Input validation
      if (!credentials.email || !credentials.password) {
        return {
          success: false,
          message: 'Email and password are required',
        };
      }

      // Find user by email
      const user = await UserRepository.findByEmail(credentials.email);

      // Check if user exists
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Verify password
      const passwordMatches = await compare(
        credentials.password,
        user.password_hash
      );

      if (!passwordMatches) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Success - return user information (excluding sensitive data)
      return {
        success: true,
        message: 'Login successful',
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          date_registered: user.date_registered,
          profile_picture: user.profile_picture,
          user_type: user.user_type,
          experience: user.experience,
        },
      };
    } catch (error) {
      console.error('Error during login verification:', error);
      return {
        success: false,
        message: 'An error occurred during login',
      };
    }
  },

  /**
   * Register a new user
   * @param registrationData The email, username (can be non unique), and password for registration
   * @returns Success status and message as a json
   */
  registerUser: async (
    registrationData: RegistrationData
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Input validation
      if (
        !registrationData.email ||
        !registrationData.username ||
        !registrationData.password
      ) {
        return {
          success: false,
          message: 'Email, username, and password are required',
        };
      }

      // Check if email is already registered
      const existingUser = await UserRepository.findByEmail(
        registrationData.email
      );
      if (existingUser) {
        return {
          success: false,
          message: 'Email already registered',
        };
      }

      //note: username can be non unique

      // Hash the password
      const hashedPassword = await bcrypt.hash(registrationData.password, 10);

      // Create the new user object
      const newUser: CreateUserDto = {
        email: registrationData.email,
        username: registrationData.username,
        password_hash: hashedPassword,
        profile_picture: null,
        user_type: 'Player' as UserType,
        experience: 0,
      };

      // Save the new user to the database and return the success msg
      await UserRepository.create(newUser);

      return {
        success: true,
        message: 'Registration successful',
      };
    } catch (error) {
      console.error('Error during user registration:', error);
      return {
        success: false,
        message: 'An error occurred during registration',
      };
    }
  },

  /**
   * Calculates the user's level based on their experience points.
   * @param experience The user's current experience points.
   * @returns The calculated user level.
   */
  getUserLevel(experience: number): number {
    return calculateLevel(experience);
  },

  /**
   * Increase User Exp given userId and exp to add
   * @param userId the User Id of the user to increase exp
   * @param expToAdd The amount of exp to increase
   * @returns A promise that resolves to the updated user object if successful, or null if the user was not found.
   */
  async increaseUserExp(
    userId: number,
    expToAdd: number
  ): Promise<User | null> {
    try {
      //get user since we need to know original exp first, also check if valid userId
      const user: User | null = await UserRepository.findById(userId);
      if (!user) {
        console.log('Invalid user ID!');
        return null;
      }

      //create the update DTO
      const update: UpdateUserDto = {
        experience: user.experience + expToAdd,
      };

      //update exp by calling the function in user.repo
      return await UserRepository.update(userId, update);
    } catch (error) {
      console.error('Error during user registration:', error);
      return null;
    }
  },
};

export default UserService;
