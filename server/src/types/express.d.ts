declare global {
  namespace Express {
    interface Request {
      user?: any | null;
    }
  }
}

export {};
