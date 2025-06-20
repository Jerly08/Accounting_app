import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, token, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isRouteReady, setIsRouteReady] = useState(false);

  useEffect(() => {
    // Only run effect after auth is checked
    if (!loading) {
      if (!isAuthenticated || !token) {
        // Redirect to login if not authenticated
        router.replace('/login');
      } else if (adminOnly && user?.role !== 'admin') {
        // Redirect to unauthorized if not admin
        router.replace('/unauthorized');
      } else {
        // Mark route as ready if authenticated and authorized
        setIsRouteReady(true);
      }
    }
  }, [loading, isAuthenticated, token, user, router, adminOnly]);

  // Show loading spinner until authentication check is complete
  if (loading || !isRouteReady) {
    return <LoadingSpinner text="Loading..." fullPage />;
  }

  // Render children if authenticated and authorized
  return children;
};

export default ProtectedRoute; 