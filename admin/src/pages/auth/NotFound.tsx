import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-slate-200 dark:text-slate-700">404</h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-4">
          Page Not Found
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved to another URL.
        </p>
        <Link
          to="/"
          className="inline-flex items-center mt-6 admin-btn-primary py-2.5 px-4"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}