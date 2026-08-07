import { body, param } from 'express-validator';

export const trackEventValidation = [
  body('eventName').notEmpty().withMessage('Event name is required').trim(),
  body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  body('sessionId').optional().trim(),
  body('url').optional().trim(),
  body('referrer').optional().trim(),
  body('deviceType').optional().trim(),
  body('properties').optional().isObject(),
];

export const getEventsByEventNameValidation = [
  param('eventName').notEmpty().withMessage('Event name is required'),
];
