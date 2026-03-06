import 'reflect-metadata';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('stores roles metadata on method', () => {
    class TestController {
      @Roles('admin', 'viewer')
      handler() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.handler);
    expect(metadata).toEqual(['admin', 'viewer']);
  });
});
