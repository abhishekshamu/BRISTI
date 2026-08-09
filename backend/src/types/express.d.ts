/// <reference types="express" />
/// <reference types="multer" />

declare global {
  namespace Express {
    interface Request {
      user?: any | null;
      /** Which collection the authenticated principal came from: 'user' (customers) or 'admin'. */
      authType?: 'user' | 'admin';
      /** Uploaded file(s) attached by multer middleware (single-file variant). */
      file?: Express.Multer.File;
      /** Uploaded files attached by multer middleware (multi-file variant). */
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
    }
  }
}

export {};
