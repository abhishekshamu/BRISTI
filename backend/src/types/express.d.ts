declare global {
  namespace Express {
    interface Request {
      user?: any | null;
      /** Which collection the authenticated principal came from: 'user' (customers) or 'admin'. */
      authType?: 'user' | 'admin';
    }
  }
}

export {};
