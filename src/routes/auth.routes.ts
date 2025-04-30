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

export default router;
