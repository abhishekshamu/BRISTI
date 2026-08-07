import { body, param } from 'express-validator';

export const createNotificationValidation = [
  body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  body('title').notEmpty().withMessage('Notification title is required').trim(),
  body('message').notEmpty().withMessage('Notification message is required').trim(),
  body('type').optional().isIn(['info', 'success', 'warning', 'error']).withMessage('Invalid notification type'),
  body('isRead').optional().isBoolean(),
];

export const markReadValidation = [
  param('id').isMongoId().withMessage('Invalid notification ID'),
];
