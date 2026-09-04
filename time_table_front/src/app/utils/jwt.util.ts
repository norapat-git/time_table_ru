import { DecodedUser, JwtHeader, JwtPayload, UserRole } from '../models/auth.model';

/**
 * Base64URL string decoding with safe UTF-8 multibyte character support (Thai, etc.)
 */
export function base64UrlDecode(str: string): string {
  try {
    // Replace URL-safe characters with standard Base64 characters
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if missing
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid Base64 string length.');
      }
      base64 += new Array(5 - pad).join('=');
    }

    // Decode Base64 to binary string
    const binaryString = atob(base64);

    // Convert binary string to UTF-8 decoded text using TextDecoder (standard in modern browsers)
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (error) {
    console.error('Failed to decode Base64URL string:', error);
    throw new Error('Invalid Base64URL string');
  }
}

/**
 * Base64URL encoder with safe UTF-8 support (used for generating mock JWTs)
 */
export function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Safely decodes a JWT token string into its header, payload, or full object.
 */
export function decodeJwt<T = JwtPayload>(token: string): T | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson) as T;
  } catch {
    return null;
  }
}

/**
 * Extracts the JWT Header
 */
export function getJwtHeader(token: string): JwtHeader | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length < 1) {
    return null;
  }

  try {
    const headerJson = base64UrlDecode(parts[0]);
    return JSON.parse(headerJson) as JwtHeader;
  } catch {
    return null;
  }
}

/**
 * Extracts the JWT Payload
 */
export function getJwtPayload(token: string): JwtPayload | null {
  return decodeJwt<JwtPayload>(token);
}

/**
 * Checks if the given token is expired
 * @param token JWT token string
 * @param offsetSeconds Optional buffer time in seconds (default 0)
 */
export function isTokenExpired(token: string, offsetSeconds: number = 0): boolean {
  const payload = getJwtPayload(token);
  if (!payload || !payload.exp) {
    // If no expiration is present, treat as not expired or invalid depending on requirements
    return false;
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= (currentTimeInSeconds + offsetSeconds);
}

/**
 * Returns the expiration date of the JWT token
 */
export function getTokenExpirationDate(token: string): Date | null {
  const payload = getJwtPayload(token);
  if (!payload || !payload.exp) {
    return null;
  }
  return new Date(payload.exp * 1000);
}

/**
 * Returns remaining time in seconds before token expires.
 * Negative number means already expired.
 */
export function getTokenRemainingSeconds(token: string): number {
  const payload = getJwtPayload(token);
  if (!payload || !payload.exp) {
    return 0;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp - currentTime;
}

/**
 * Extracts a normalized DecodedUser object from JWT Payload
 */
export function extractUserFromToken(token: string): DecodedUser | null {
  const payload = getJwtPayload(token);
  if (!payload) {
    return null;
  }

  const userId = (payload.userId || payload.sub || payload.citizenId || payload['CITIZEN_ID'] || payload['client_id'] || 'USR-001') as string;
  const username = (payload.username || payload['USER_NAME'] || payload.email?.split('@')[0] || 'user') as string;
  const email = (payload.email || `${username}@university.ac.th`) as string;

  // Build readable display name
  const firstNameTH = (payload.firstNameTH || payload['FIRST_NAME'] || '') as string;
  const lastNameTH = (payload.lastNameTH || payload['LAST_NAME'] || '') as string;
  let displayName = `${firstNameTH} ${lastNameTH}`.trim();
  if (!displayName) {
    displayName = (payload['name'] || username) as string;
  }

  // Determine Role
  let role: UserRole = 'INSTRUCTOR';
  const rawRole = (payload.role || payload['SYS_LEVEL'] || payload['SYS_ACCESS'] || '') as string;
  const upperRole = String(rawRole).toUpperCase();

  if (upperRole.includes('ADMIN') || upperRole === '1') {
    role = 'ADMIN';
  } else if (upperRole.includes('INSTRUCTOR') || upperRole.includes('TEACHER') || upperRole === '2') {
    role = 'INSTRUCTOR';
  } else if (upperRole.includes('STAFF') || upperRole === '3') {
    role = 'STAFF';
  } else if (upperRole.includes('STUDENT') || upperRole === '4') {
    role = 'STUDENT';
  }

  const roles: UserRole[] = Array.isArray(payload.roles)
    ? (payload.roles as UserRole[])
    : [role];

  return {
    userId,
    username,
    email,
    displayName,
    role,
    roles,
    citizenId: (payload.citizenId || payload['CITIZEN_ID'] || payload['PER_CITIZEN_ID']) as string | undefined,
    department: (payload.department || payload['FACULTY_NAME'] || 'สำนักบริการทางวิชาการและทดสอบประเมินผล') as string | undefined,
    facultyNo: (payload.facultyNo || payload['FACULTY_NO']) as string | undefined,
    majorNo: (payload.majorNo || payload['MAJOR_NO']) as string | undefined,
    rawPayload: payload,
  };
}

/**
 * Format remaining seconds into human-readable mm:ss or hh:mm:ss
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return 'หมดอายุแล้ว';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ชม.`;
  }
  return `${m}:${s.toString().padStart(2, '0')} น.`;
}

/**
 * Generates a mock signed JWT token for testing and local development
 */
export function generateMockJwt(
  claims: Partial<JwtPayload> = {},
  expiresInMinutes: number = 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInMinutes * 60;

  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: JwtPayload = {
    sub: '1300000000001',
    iss: 'https://timetable.li.university.ac.th',
    aud: 'timetable-client',
    iat: now,
    exp: exp,
    userId: 'U-001',
    username: 'somchai.j',
    email: 'somchai.j@li.university.ac.th',
    role: 'INSTRUCTOR',
    roles: ['INSTRUCTOR'],
    firstNameTH: 'สมชาย',
    lastNameTH: 'ใจดี',
    department: 'สาขาวิชาภาษาอังกฤษ',
    ...claims,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  // Mock signature for simulation
  const mockSignature = base64UrlEncode('mock_signature_' + Math.random().toString(36).substring(2));

  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}
