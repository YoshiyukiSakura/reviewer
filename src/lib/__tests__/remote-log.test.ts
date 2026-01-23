import {
  initRemoteLog,
  sendLog,
  log,
  flush,
  shutdown,
  getBufferSize,
  clearBuffer,
} from '../remote-log';

describe('remote-log', () => {
  const mockEndpoint = 'https://api.example.com/logs';

  beforeEach(() => {
    clearBuffer();
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
  });

  afterEach(async () => {
    await shutdown();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('initRemoteLog', () => {
    it('should initialize with provided config', () => {
      initRemoteLog({ endpoint: mockEndpoint });
      expect(getBufferSize()).toBe(0);
    });
  });

  describe('sendLog', () => {
    it('should add log entry to buffer', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 10 });

      await sendLog('info', 'Test message');

      expect(getBufferSize()).toBe(1);
    });

    it('should auto-flush when batch size is reached', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 2 });

      await sendLog('info', 'Message 1');
      await sendLog('info', 'Message 2');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(getBufferSize()).toBe(0);
    });

    it('should include context in log entry', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 1 });

      await sendLog('error', 'Error occurred', { userId: '123' });

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"userId":"123"'),
        })
      );
    });
  });

  describe('log convenience methods', () => {
    beforeEach(() => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 1 });
    });

    it('should send debug log', async () => {
      await log.debug('Debug message');

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          body: expect.stringContaining('"level":"debug"'),
        })
      );
    });

    it('should send info log', async () => {
      await log.info('Info message');

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          body: expect.stringContaining('"level":"info"'),
        })
      );
    });

    it('should send warn log', async () => {
      await log.warn('Warn message');

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          body: expect.stringContaining('"level":"warn"'),
        })
      );
    });

    it('should send error log', async () => {
      await log.error('Error message');

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          body: expect.stringContaining('"level":"error"'),
        })
      );
    });
  });

  describe('flush', () => {
    it('should send all buffered logs', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 100 });

      await sendLog('info', 'Message 1');
      await sendLog('info', 'Message 2');
      await sendLog('info', 'Message 3');

      expect(getBufferSize()).toBe(3);

      await flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(getBufferSize()).toBe(0);
    });

    it('should include API key in Authorization header', async () => {
      initRemoteLog({ endpoint: mockEndpoint, apiKey: 'test-key', batchSize: 1 });

      await sendLog('info', 'Test');

      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should restore logs to buffer on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      initRemoteLog({ endpoint: mockEndpoint, batchSize: 100 });

      await sendLog('info', 'Message 1');
      await sendLog('info', 'Message 2');

      await flush();

      expect(getBufferSize()).toBe(2);
    });
  });

  describe('shutdown', () => {
    it('should flush remaining logs and stop timer', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 100 });

      await sendLog('info', 'Final message');

      await shutdown();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(getBufferSize()).toBe(0);
    });
  });

  describe('automatic flush interval', () => {
    it('should flush logs after interval', async () => {
      initRemoteLog({ endpoint: mockEndpoint, batchSize: 100, flushInterval: 5000 });

      await sendLog('info', 'Message');

      expect(global.fetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
