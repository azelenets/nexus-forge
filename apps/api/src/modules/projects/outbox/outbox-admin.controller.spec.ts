import { OutboxAdminController } from './outbox-admin.controller';
import type { OutboxAdminService } from './outbox-admin.service';

describe('OutboxAdminController', () => {
  function makeController() {
    const service = {
      listEvents: jest.fn().mockResolvedValue([{ id: 'e1' }]),
      listDeadLetters: jest.fn().mockResolvedValue([{ id: 'd1' }]),
      replayDeadLetter: jest.fn().mockResolvedValue({ replayed: true, id: 'd1' }),
    } as unknown as OutboxAdminService;

    return { controller: new OutboxAdminController(service), service };
  }

  it('delegates listEvents', async () => {
    const { controller, service } = makeController();

    await expect(controller.listEvents('pending', 10)).resolves.toEqual([{ id: 'e1' }]);
    expect(service.listEvents).toHaveBeenCalledWith('pending', 10);
  });

  it('delegates listDeadLetters', async () => {
    const { controller, service } = makeController();

    await expect(controller.listDeadLetters(20)).resolves.toEqual([{ id: 'd1' }]);
    expect(service.listDeadLetters).toHaveBeenCalledWith(20);
  });

  it('delegates replayDeadLetter', async () => {
    const { controller, service } = makeController();

    await expect(controller.replayDeadLetter('11111111-1111-1111-1111-111111111111')).resolves.toEqual({
      replayed: true,
      id: 'd1',
    });
    expect(service.replayDeadLetter).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });
});
