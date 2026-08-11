import dotenv from 'dotenv';
import connectDB from './config/database';
import app from './app';
import { ensureDefaultAdmin } from './scripts/ensure-default-admin';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => ensureDefaultAdmin())
  .then(() => {
    // Bind to 0.0.0.0 so the server accepts connections from any interface
    // (required by Render/Railway/Fly containers; harmless on bare hosts).
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
