import express, { Request, Response } from 'express';
import { UserService } from '../services/user-service.js';
import { LoginRequest, RegisterRequest } from '../types/routes.types.js';
// Define custom session interface to fix the session property errors
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userType: string;
  }
}

const router = express.Router();

// Login route
router
  .route('/login')
  .post(async (req: Request<unknown, unknown, LoginRequest>, res: Response) => {
    try {
      const { email, password } = req.body;

      // Basic validation
      if (!email || !password) {
        res
          .status(400)
          .json({ success: false, message: 'Email and password are required' });
        return;
      }

      // Verify login using UserService
      const result = await UserService.verifyLogin({ email, password });

      if (result.success && result.user) {
        // Set session information if using sessions
        // We know req.session exists because it's set up in the middleware
        req.session.userId = result.user.user_id;
        req.session.userType = result.user.user_type;

        res.status(200).json({
          success: true,
          message: 'Login successful',
          user: result.user,
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message || 'Invalid credentials',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  });

// Register route
router
  .route('/register')
  .post(
    async (req: Request<unknown, unknown, RegisterRequest>, res: Response) => {
      try {
        const { email, username, password } = req.body;

        // Basic validation
        if (!email || !username || !password) {
          res
            .status(400)
            .json({ success: false, message: 'All fields are required' });
          return;
        }

        // Check password strength
        if (password.length < 8) {
          res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long',
          });
          return;
        }

        // Register user using UserService
        const result = await UserService.registerUser({
          email,
          username,
          password,
        });

        if (result.success) {
          res.status(201).json({
            success: true,
            message: 'Registration successful',
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.message || 'Registration failed',
          });
        }
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
          success: false,
          message: 'Server error during registration',
        });
      }
    }
  );

// Logout route
router.route('/logout').get((req: Request, res: Response) => {
  try {
    // Clear session
    // We know req.session exists because it's set up in the middleware
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'Failed to logout',
        });
        return;
      }

      // Clear cookies if using cookie auth
      res.clearCookie('connect.sid');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
});

// Change username
router.route('/change-username').post(async (req: Request, res: Response) => {
  try {
    const { userId, newUsername } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    if (!newUsername) {
      res.status(400).json({
        success: false,
        message: 'New username is required',
      });
      return;
    }

    // Call service to change username
    const result = await UserService.changeUsername(userId, newUsername);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to update username',
      });
    }
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing username',
    });
  }
});

// Change avatar
router.route('/change-avatar').post(async (req: Request, res: Response) => {
  try {
    const { userId, newAvatarId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    if (newAvatarId === undefined || newAvatarId === null) {
      res.status(400).json({
        success: false,
        message: 'New avatar ID is required',
      });
      return;
    }

    // Call service to change avatar
    const result = await UserService.changeAvatar(userId, newAvatarId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to update avatar',
      });
    }
  } catch (error) {
    console.error('Error changing avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing avatar',
    });
  }
});

// Reset password
router.route('/reset-password').post(async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    // Call service to reset password
    const result = await UserService.resetPassword(
      userId,
      currentPassword,
      newPassword
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to reset password',
      });
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password',
    });
  }
});

// Delete account
router.route('/delete-account').post(async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    // Call service to delete account
    const result = await UserService.deleteAccount(userId);

    if (result.success) {
      // Clear session on successful account deletion
      req.session.destroy((err) => {
        if (err) {
          console.error(
            'Error destroying session after account deletion:',
            err
          );
        }
        res.clearCookie('connect.sid');
        res.status(200).json(result);
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to delete account',
      });
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account',
    });
  }
});

// Find user by email
router.route('/find-by-email').get(async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    // Call service to find user by email
    const user = await UserService.findByEmail(email);
    if (user) {
      res.status(200).json({
        success: true,
        message: 'User found',
        user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error('Error finding user by email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while finding user',
    });
  }
});

// Get current user data
router.route('/user').get(async (req: Request, res: Response) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    // Fetch user data from database
    const user = await UserService.getUserById(req.session.userId);

    if (!user) {
      // User not found in database (session exists but user was deleted)
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Return user data (excluding sensitive information)
    res.status(200).json({
      success: true,
      message: 'User data retrieved successfully',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        user_type: user.user_type,
        experience: user.experience,
        date_registered: user.date_registered,
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data',
    });
  }
});

export default router;
