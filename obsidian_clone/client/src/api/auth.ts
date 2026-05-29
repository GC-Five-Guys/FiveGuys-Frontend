import { apiRequest } from './client';
import { setAuthToken } from './tokenStorage';

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  display_name?: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  username: string;
  display_name: string;
}

export const login = async (credentials: LoginRequest) => {
  const result = await apiRequest<AuthResult>('/auth/login', {
    method: 'POST',
    auth: false,
    body: credentials,
  });

  setAuthToken(result.token);
  return result;
};

export const signup = async (input: SignupRequest) => {
  const result = await apiRequest<AuthResult>('/auth/signup', {
    method: 'POST',
    auth: false,
    body: input,
  });

  setAuthToken(result.token);
  return result;
};
