import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class UserController {
  constructor(private userService: UserService) {}

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const user = await this.userService.getUserById(userId);
    res.status(200).json({ success: true, data: user });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;
    const user = await this.userService.updateUser(userId, { firstName, lastName, phone, dateOfBirth, gender });
    res.status(200).json({ success: true, data: user });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Please provide current password and new password');
    }

    await this.userService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  });

  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    await this.userService.deleteUser(userId);
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  });

  listAddresses = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.userService.listAddresses(req.user!.id) });
  });

  addAddress = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await this.userService.addAddress(req.user!.id, req.body) });
  });

  updateAddress = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.userService.updateAddress(req.user!.id, req.params.addressId, req.body) });
  });

  deleteAddress = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.userService.removeAddress(req.user!.id, req.params.addressId) });
  });

  setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.userService.setDefaultAddress(req.user!.id, req.params.addressId) });
  });

  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.userService.updatePreferences(req.user!.id, req.body) });
  });

  listCustomers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, status } = req.query;
    const result = await this.userService.listCustomers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string | undefined,
      status: status as string | undefined,
    });
    res.status(200).json({ success: true, data: result });
  });

  getCustomerById = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await this.userService.getCustomerById(req.params.id) });
  });

  updateCustomerStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!status) {
      throw new ValidationError('Please provide a status');
    }
    res.status(200).json({ success: true, data: await this.userService.updateCustomerStatus(req.params.id, status) });
  });
}
