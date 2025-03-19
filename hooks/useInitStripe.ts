import { useEffect, useState } from 'react';
import { initializeStripe } from '@/services/stripeService';

export function useInitStripe() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        const result = await initializeStripe();
        
        if (isMounted) {
          setIsInitialized(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize Stripe'));
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
  };
} 