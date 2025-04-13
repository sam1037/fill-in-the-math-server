// src/services/user.service.ts

import { compare } from 'bcrypt';
import { UserRepository } from '../repositories/user.repository.js';
import { User } from '../types/db.types.js';
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

  getUserLevel(experience: number) {
    return calculateLevel(experience);
  },
};

export default UserService;
