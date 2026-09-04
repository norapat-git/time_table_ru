import {
  base64UrlDecode,
  base64UrlEncode,
  decodeJwt,
  extractUserFromToken,
  generateMockJwt,
  getJwtHeader,
  getJwtPayload,
  getTokenRemainingSeconds,
  isTokenExpired,
} from './jwt.util';

describe('JWT Utilities', () => {
  it('should correctly encode and decode Thai UTF-8 text with Base64URL', () => {
    const thaiText = 'ภาษาไทย สถาบันภาษา อาจารย์สมชาย';
    const encoded = base64UrlEncode(thaiText);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toBe(thaiText);
  });

  it('should generate and decode a valid mock JWT with Thai claims', () => {
    const mockToken = generateMockJwt({
      userId: 'INS-001',
      username: 'somchai.j',
      firstNameTH: 'สมชาย',
      lastNameTH: 'ใจดี',
      role: 'INSTRUCTOR',
      department: 'สาขาวิชาภาษาอังกฤษ',
    }, 60);

    expect(mockToken).toBeTruthy();
    expect(mockToken.split('.').length).toBe(3);

    const header = getJwtHeader(mockToken);
    expect(header?.alg).toBe('HS256');
    expect(header?.typ).toBe('JWT');

    const payload = getJwtPayload(mockToken);
    expect(payload?.firstNameTH).toBe('สมชาย');
    expect(payload?.role).toBe('INSTRUCTOR');

    const user = extractUserFromToken(mockToken);
    expect(user?.displayName).toBe('สมชาย ใจดี');
    expect(user?.role).toBe('INSTRUCTOR');
  });

  it('should correctly detect expired and unexpired tokens', () => {
    const validToken = generateMockJwt({}, 60); // 60 mins in future
    expect(isTokenExpired(validToken)).toBeFalse();
    expect(getTokenRemainingSeconds(validToken)).toBeGreaterThan(0);

    const expiredToken = generateMockJwt({}, -10); // 10 mins in past
    expect(isTokenExpired(expiredToken)).toBeTrue();
    expect(getTokenRemainingSeconds(expiredToken)).toBeLessThanOrEqual(0);
  });

  it('should handle malformed tokens gracefully without throwing exceptions', () => {
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt('invalid.token')).toBeNull();
    expect(decodeJwt('invalid_string')).toBeNull();
    expect(extractUserFromToken('malformed.payload.xxx')).toBeNull();
  });
});
