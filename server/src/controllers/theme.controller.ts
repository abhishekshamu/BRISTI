import { Request, Response, NextFunction } from 'express';
import { ThemeService } from '../services/theme.service';
import { asyncHandler } from '../middleware/async';

export class ThemeController {
  constructor(private themeService: ThemeService) {}

  getActiveTheme = asyncHandler(async (req: Request, res: Response) => {
    const theme = await this.themeService.getActiveTheme();
    res.status(200).json({
      success: true,
      data: theme
    });
  });

  getAllThemes = asyncHandler(async (req: Request, res: Response) => {
    const themes = await this.themeService.getAllThemes();
    res.status(200).json({
      success: true,
      data: themes
    });
  });

  getThemeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const theme = await this.themeService.getThemeById(id);
    res.status(200).json({
      success: true,
      data: theme
    });
  });

  createTheme = asyncHandler(async (req: Request, res: Response) => {
    const theme = await this.themeService.createTheme(req.body);
    res.status(201).json({
      success: true,
      data: theme
    });
  });

  updateTheme = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const theme = await this.themeService.updateTheme(id, req.body);
    res.status(200).json({
      success: true,
      data: theme
    });
  });

  deleteTheme = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.themeService.deleteTheme(id);
    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully'
    });
  });

  setActiveTheme = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const theme = await this.themeService.setActiveTheme(id);
    res.status(200).json({
      success: true,
      data: theme
    });
  });
}
