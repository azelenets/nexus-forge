import type { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  function makeController() {
    const authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'a' }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'b' }),
      logout: jest.fn().mockResolvedValue({ revoked: true }),
      me: jest.fn().mockResolvedValue({ id: 'u1' }),
    } as unknown as AuthService;

    return { controller: new AuthController(authService), authService };
  }

  it('delegates login', async () => {
    const { controller, authService } = makeController();
    await expect(controller.login({ email: 'a@b.com', password: 'password123' })).resolves.toEqual({ accessToken: 'a' });
    expect(authService.login).toHaveBeenCalledWith('a@b.com', 'password123');
  });

  it('delegates refresh', async () => {
    const { controller, authService } = makeController();
    await expect(controller.refresh({ refreshToken: 't' })).resolves.toEqual({ accessToken: 'b' });
    expect(authService.refresh).toHaveBeenCalledWith('t');
  });

  it('delegates logout', async () => {
    const { controller, authService } = makeController();
    await expect(controller.logout({ refreshToken: 't' })).resolves.toEqual({ revoked: true });
    expect(authService.logout).toHaveBeenCalledWith('t');
  });

  it('delegates me', async () => {
    const { controller, authService } = makeController();
    const user = { sub: 'u1', email: 'a@b.com', roles: ['admin'], tokenType: 'access' as const };

    await expect(controller.me(user)).resolves.toEqual({ id: 'u1' });
    expect(authService.me).toHaveBeenCalledWith(user);
  });
});
