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
      
      try {
        // Only POST is currently supported by our API client
        if (method !== 'POST') {
          throw new Error(`HTTP ${method} is not supported. Only POST is currently implemented.`);
        }
        
        // Use the POST method for all mutations
        const response = await api.post(url, variables);
        
        // Parse the response JSON
        const responseData = await response.json().catch(() => ({}));
        
        return responseData as TData;
      } catch (error: any) {
        // Re-throw the error with a more descriptive message if available
        const errorMessage = error.data?.detail || 
                           error.data?.message || 
                           error.message || 
                           'An error occurred while processing your request';
        const errorWithMessage = new Error(errorMessage);
        
        // Attach additional error information
        if (error.status) {
          (errorWithMessage as any).status = error.status;
        }
        if (error.data) {
          (errorWithMessage as any).data = error.data;
        }
        
        throw errorWithMessage;
      }
    },
    options
  );
}
