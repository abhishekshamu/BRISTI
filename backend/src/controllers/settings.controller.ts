import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { asyncHandler } from '../middleware/async';

export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.getPublicSettings();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSettings(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateBranding = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateBranding(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateColors = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateColors(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateTypography = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateTypography(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateLayout = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateLayout(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateContactInfo = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateContactInfo(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateSocialLinks = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSocialLinks(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateSEO = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSEO(req.body);
    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateStoreSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateStoreSettings(req.body);
    res.status(200).json({ success: true, data: settings });
  });

  updateNavbar = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSettings({ navbar: req.body });
    res.status(200).json({ success: true, data: settings });
  });

  updateFooter = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSettings({ footer: req.body });
    res.status(200).json({ success: true, data: settings });
  });

  updateHomepage = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSettings({ homepageSections: req.body });
    res.status(200).json({ success: true, data: settings });
  });

  getHomepage = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.getSettings();
    res.status(200).json({ success: true, data: settings.homepageSections || [] });
  });

  updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.updateSettings({ announcement: req.body });
    res.status(200).json({ success: true, data: settings.announcement });
  });
}
