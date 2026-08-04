import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await this.authService.register(req.body);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Please provide email and password');
    }

    const { user, accessToken, refreshToken } = await this.authService.login(email, password);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Please provide refresh token');
    }

    const { accessToken, refreshToken: nextRefreshToken, user } = await this.authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: nextRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!refreshToken) {
      throw new ValidationError('Please provide refresh token');
    }

    const result = await this.authService.logout(userId!, refreshToken);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Please provide email');
    }

    const result = await this.authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      throw new ValidationError('Please provide token');
    }

    if (!password) {
      throw new ValidationError('Please provide password');
    }

    const result = await this.authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      throw new ValidationError('Please provide token');
    }

    const result = await this.authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await this.authService.getMe(userId);

    res.status(200).json({
      success: true,
      data: user
    });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await this.authService.updateProfile(userId, req.body);

    res.status(200).json({
      success: true,
      data: user
    });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Please provide current password and new password');
    }

    const result = await this.authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });
}
