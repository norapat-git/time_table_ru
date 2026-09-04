export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STAFF' | 'STUDENT' | 'GUEST';

export interface JwtHeader {
  alg: string;
  typ: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  // Standard JWT claims
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;

  // Custom / App-specific claims
  userId?: string;
  username?: string;
  email?: string;
  citizenId?: string;
  role?: UserRole;
  roles?: UserRole[];
  firstNameTH?: string;
  lastNameTH?: string;
  firstNameEN?: string;
  lastNameEN?: string;
  department?: string;
  facultyNo?: string;
  majorNo?: string;

  [key: string]: unknown;
}

export interface DecodedUser {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles: UserRole[];
  citizenId?: string;
  department?: string;
  facultyNo?: string;
  majorNo?: string;
  avatarUrl?: string;
  rawPayload: JwtPayload;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: DecodedUser | null;
  expiresAt: Date | null;
  remainingSeconds: number;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password?: string;
  citizenId?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: DecodedUser;
}
