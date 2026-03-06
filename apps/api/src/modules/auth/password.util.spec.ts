import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes and verifies password', () => {
    const password = 'StrongPassword123!';
    const hash = hashPassword(password);

    expect(hash.startsWith('pbkdf2$')).toBe(true);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('returns false for malformed hash', () => {
    expect(verifyPassword('password', 'invalid')).toBe(false);
    expect(verifyPassword('password', 'pbkdf2$bad$hash$value')).toBe(false);
  });
});
