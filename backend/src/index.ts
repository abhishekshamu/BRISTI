import dotenv from 'dotenv';
import connectDB from './config/database';
import app from './app';
import { ensureDefaultAdmin } from './scripts/ensure-default-admin';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => ensureDefaultAdmin())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
