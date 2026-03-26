export interface User {
  id: string;
  phone: string;
  name: string;
  preferredLanguage: 'en' | 'am';
  createdAt: string;
}

export interface SendOtpInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileInput {
  name?: string;
  preferredLanguage?: 'en' | 'am';
}
