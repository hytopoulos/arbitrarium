import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { api } from '../api/config';

export function useApiQuery<T>(
  key: string | string[],
  endpoint: string,
  options: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> = {}
): UseQueryResult<T, Error> {
  return useQuery<T, Error>(
    Array.isArray(key) ? key : [key],
    async () => {
      const response = await api.get(endpoint);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || error.message || 'An error occurred while fetching data'
        );
      }
      return response.json();
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      ...options,
    }
  );
}
