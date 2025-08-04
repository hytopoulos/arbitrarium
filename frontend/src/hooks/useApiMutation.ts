import { useMutation, UseMutationOptions, UseMutationResult } from 'react-query';
import { api } from '../api/config';

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function useApiMutation<TData = unknown, TError = Error, TVariables = void>(
  key: string,
  endpoint: string | ((variables: TVariables) => string),
  method: HttpMethod = 'POST',
  options: Omit<
    UseMutationOptions<TData, TError, TVariables>,
    'mutationKey' | 'mutationFn'
  > = {}
): UseMutationResult<TData, TError, TVariables> {
  return useMutation<TData, TError, TVariables>(
    key,
    async (variables: TVariables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;
      const response = await api(url, {
        method,
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || error.message || 'An error occurred while processing your request'
        );
      }

      // For DELETE requests, we might not have a response body
      if (method === 'DELETE' && response.status === 204) {
        return {} as TData;
      }

      return response.json();
    },
    options
  );
}
