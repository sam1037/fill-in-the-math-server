// src/services/user.service.ts

import bcrypt, { compare } from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateUserDto, User } from '../types/db.types.js';
import { calculateLevel } from '../utils/user-level-calculator.js';

// Login credential type
interface LoginCredentials {
  email: string;
  password: string;
}

// Login result type
interface LoginResult {
  success: boolean;
  message: string;
  user?: Omit<User, 'password_hash'>; // Use Omit to exclude password_hash
}

// Registration data type
interface RegistrationData {
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
          current_ranking_score: user.current_ranking_score,
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
   * @param registrationData The email, username, and password for registration
   * @returns Success status and message
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

      //TODO check if unique username (since we assumed unique username in db)

      // Hash the password
      const hashedPassword = await bcrypt.hash(registrationData.password, 10);

      // Create the new user object
      const newUser: CreateUserDto = {
        email: registrationData.email,
        username: registrationData.username,
        password_hash: hashedPassword,
        current_ranking_score: 0,
        profile_picture: null,
        user_type: 'Player',
        experience: 0,
      };

      // Save the new user to the database
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

  //? do we change the parameter to the entire user obj instead?
  //get the user level from experince
  getUserLevel(experience: number) {
    return calculateLevel(experience);
  },
};

export default UserService;
