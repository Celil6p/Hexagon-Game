// utils/api.ts
import { useAuth } from '../auth/AuthContext';
import { useCallback, useRef } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const useAuthenticatedRequest = () => {
  const { accessToken, refreshToken, logout } = useAuth();
  const accessTokenRef = useRef(accessToken);
  const refreshTokenRef = useRef(refreshToken);

  // Update refs when tokens change
  if (accessToken !== accessTokenRef.current) {
    accessTokenRef.current = accessToken;
  }
  if (refreshToken !== refreshTokenRef.current) {
    refreshTokenRef.current = refreshToken;
  }

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenRef.current }),
      });
      if (!response.ok) throw new Error('Token refresh failed');
      const data = await response.json();
      localStorage.setItem('accessToken', data.access_token);
      accessTokenRef.current = data.access_token;
      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  }, [logout]);

  const authenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessTokenRef.current}`);

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        const retryResponse = await fetch(url, { ...options, headers });
        if (retryResponse.status === 401) {
          throw new Error('Authentication failed');
        }
        return retryResponse;
      }
      return response;
    } catch (error) {
      console.error('Authenticated request error:', error);
      throw error;
    }
  }, [refreshAccessToken]);

  return authenticatedRequest;
};