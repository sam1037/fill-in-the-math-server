// Define types for request bodies
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface UsernameUpdateRequest {
  newUsername: string;
}

export interface AvatarUpdateRequest {
  newAvatarId: number;
}
