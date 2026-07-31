import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrderRepository } from '../repositories/order.repository';
import { asyncHandler } from '../middleware/async';

export class AdminController {
  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private userRepo: UserRepository,
    private productRepo: ProductRepository,
    private orderRepo: OrderRepository
  ) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const { admin, accessToken, refreshToken } = await this.adminService.register(req.body);
    res.status(201).json({
      success: true,
      data: {
        admin,
        accessToken,
        refreshToken
      }
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { admin, accessToken, refreshToken } = await this.adminService.login(email, password);
    res.status(200).json({
      success: true,
      data: {
        admin,
        accessToken,
        refreshToken
      }
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
    const admin = await this.adminService.updateAdmin(id, req.body);
    res.status(200).json({
      success: true,
      data: admin
    });
  });

  deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.adminService.deleteAdmin(id);
    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  });

  createAdmin = asyncHandler(async (req: Request, res: Response) => {
    const admin = await this.adminService.createAdmin(req.body);
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
}
