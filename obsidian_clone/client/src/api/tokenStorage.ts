const TOKEN_STORAGE_KEY = 'fiveguys.authToken';

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string) => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};
