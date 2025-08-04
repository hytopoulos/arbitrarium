import { useState, useCallback } from 'react';
import { Environment } from '../types';
import { useApiQuery } from './useApiQuery';

export function useEnvironments() {
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Fetch all environments
  const {
    data: environments = [],
    isLoading: isLoadingEnvs,
    error: envError,
    refetch: refetchEnvs,
  } = useApiQuery<Environment[]>('environments', '/env/');

  // Fetch a single environment by ID
  const {
    data: environment,
    isLoading: isLoadingEnv,
    error: singleEnvError,
    refetch: fetchEnvironment,
  } = useApiQuery<Environment>(
    ['environment', currentEnv?.id],
    currentEnv ? `/env/${currentEnv.id}/` : '',
    {
      enabled: !!currentEnv?.id,
      onSuccess: (data) => {
        setCurrentEnv(data);
      },
    }
  );

  // Handle environment selection
  const handleSelectEnv = useCallback((env: Environment | null) => {
    setCurrentEnv(env);
    // If we have an env with an ID, it will trigger the query above
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return {
    // State
    currentEnv,
    environments,
    isSidebarOpen,
    
    // Loading states
    isLoading: isLoadingEnvs || (!!currentEnv?.id && isLoadingEnv),
    error: envError || singleEnvError,
    
    // Actions
    selectEnvironment: handleSelectEnv,
    toggleSidebar,
    refetchEnvironments: refetchEnvs,
    refreshCurrentEnv: () => currentEnv?.id && fetchEnvironment(),
  };
}
