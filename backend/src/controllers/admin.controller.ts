import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrderRepository } from '../repositories/order.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { asyncHandler } from '../middleware/async';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from '../config/cookies';

export class AdminController {
  constructor(
    private adminService: AdminService,
    private userRepo: UserRepository,
    private productRepo: ProductRepository,
    private orderRepo: OrderRepository,
    private authRepo: AuthRepository,
    private authService?: AuthService
  ) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { admin, accessToken, refreshToken } = await this.adminService.login(email, password);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json({
      success: true,
      data: {
        admin,
        accessToken,
        refreshToken
      }
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const cookieRefresh = (req.cookies as Record<string, unknown>)?.[REFRESH_TOKEN_COOKIE];
    const { refreshToken } = req.body;
    const token = typeof cookieRefresh === 'string' && cookieRefresh.length > 0 ? cookieRefresh : refreshToken;
    const adminId = req.user ? req.user.id : null;

    if (token && adminId && this.authRepo) {
      await this.authRepo.deleteRefreshToken(token).catch(() => undefined);
      await this.authRepo.deleteOwnerTokens(adminId, 'admin').catch(() => undefined);
    }

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  getAllAdmins = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    const result = await this.adminService.getAllAdmins(options);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getAdminById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const admin = await this.adminService.getAdminById(id);
    res.status(200).json({
      success: true,
      data: admin
    });
  });

  updateAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const admin = await this.adminService.updateAdmin(id, req.body, {
      id: (req.user as any)?._id?.toString(),
      role: (req.user as any)?.role
    });
    res.status(200).json({
      success: true,
      data: admin
    });
  });

  deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.adminService.deleteAdmin(id, {
      id: (req.user as any)?._id?.toString(),
      role: (req.user as any)?.role
    });
    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  });

  createAdmin = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminService.createAdmin(req.body, (req.user as any)?.role);
    res.status(201).json({
      success: true,
      data: admin
    });
  });

  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const userCount = await this.userRepo.count({});
    const productCount = await this.productRepo.count({});
    const orderCount = await this.orderRepo.count({});
    const recentOrders = await this.orderRepo.findRecent(10);

    const salesStats = await this.orderRepo.getSalesStats(new Date(0), new Date());
    const userStats = await this.userRepo.getUserStats();

    res.status(200).json({
      success: true,
      data: {
        userCount,
        productCount,
        orderCount,
        salesStats,
        userStats,
        recentOrders
      }
    });
  });

  getAuthStats = asyncHandler(async (req: Request, res: Response) => {
    if (!this.authService) {
      res.status(404).json({ success: false, message: 'Auth stats are not available' });
      return;
    }

    const stats = await this.authService.getAuthStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminService.getAdminById((req.user as any)?._id?.toString());
    res.status(200).json({
      success: true,
      data: admin
    });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const result = await this.adminService.changePassword(
      (req.user as any)?._id?.toString(),
      currentPassword,
      newPassword
    );
    res.status(200).json({
      success: true,
      data: result
    });
  });
}
