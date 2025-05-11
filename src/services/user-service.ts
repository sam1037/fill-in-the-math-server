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
   * Find a user by email
   * @param email The email to search for
   * @returns The user object if found (without password hash), or null
   */
  findByEmail: async (
    email: string
  ): Promise<Omit<User, 'password_hash'> | null> => {
    try {
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return null;
      }

      // Return user without password_hash
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
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
   * Get user by ID
   * @param userId The user ID to fetch
   * @returns User object without password hash or null if not found
   */
  getUserById: async (
    userId: number
  ): Promise<Omit<User, 'password_hash'> | null> => {
    try {
      const user = await UserRepository.findById(userId);

      if (!user) {
        return null;
      }

      // Return user without password_hash using object destructuring
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  },

  //get the user level from experince
  getUserLevel(experience: number) {
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

  /**
   * Change a user's username
   * @param userId The ID of the user
   * @param newUsername The new username
   * @returns Success status and message, with updated user data if successful
   */
  async changeUsername(
    userId: number,
    newUsername: string
  ): Promise<{
    success: boolean;
    message: string;
    user?: Omit<User, 'password_hash'>;
  }> {
    try {
      // Input validation
      if (!newUsername || newUsername.trim() === '') {
        return {
          success: false,
          message: 'Username cannot be empty',
        };
      }

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update the username
      const update: UpdateUserDto = {
        username: newUsername,
      };

      const updatedUser = await UserRepository.update(userId, update);

      if (!updatedUser) {
        return {
          success: false,
          message: 'Failed to update username',
        };
      }

      // Return success with user data (excluding password hash)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        message: 'Username updated successfully',
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Error changing username:', error);
      return {
        success: false,
        message: 'An error occurred while updating the username',
      };
    }
  },

  /**
   * Change a user's avatar (profile picture)
   * @param userId The ID of the user
   * @param newAvatarId The new avatar ID
   * @returns Success status and message, with updated user data if successful
   */
  async changeAvatar(
    userId: number,
    newAvatarId: number
  ): Promise<{
    success: boolean;
    message: string;
    user?: Omit<User, 'password_hash'>;
  }> {
    try {
      // Input validation
      if (newAvatarId === undefined || newAvatarId === null) {
        return {
          success: false,
          message: 'Avatar ID is required',
        };
      }

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update the avatar
      const update: UpdateUserDto = {
        profile_picture: newAvatarId,
      };

      const updatedUser = await UserRepository.update(userId, update);

      if (!updatedUser) {
        return {
          success: false,
          message: 'Failed to update avatar',
        };
      }

      // Return success with user data (excluding password hash)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        message: 'Avatar updated successfully',
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Error changing avatar:', error);
      return {
        success: false,
        message: 'An error occurred while updating the avatar',
      };
    }
  },

  /**
   * Reset a user's password
   * @param userId The ID of the user
   * @param currentPassword The current password for verification
   * @param newPassword The new password
   * @returns Success status and message
   */
  async resetPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Input validation
      if (!currentPassword || !newPassword) {
        return {
          success: false,
          message: 'Current password and new password are required',
        };
      }

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const passwordMatches = await compare(
        currentPassword,
        user.password_hash
      );

      if (!passwordMatches) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      const update: UpdateUserDto = {
        password_hash: hashedPassword,
      };

      const updatedUser = await UserRepository.update(userId, update);

      if (!updatedUser) {
        return {
          success: false,
          message: 'Failed to update password',
        };
      }

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        message: 'An error occurred while resetting the password',
      };
    }
  },

  /**
   * Delete a user account
   * @param userId The ID of the user to delete
   * @returns Success status and message
   */
  async deleteAccount(userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Delete the user
      const deleted = await UserRepository.delete(userId);

      if (!deleted) {
        return {
          success: false,
          message: 'Failed to delete account',
        };
      }

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting account:', error);
      return {
        success: false,
        message: 'An error occurred while deleting the account',
      };
    }
  },
};

export default UserService;
