import express, { Express } from 'express';
import request from 'supertest';
import { ConvisoConfig } from '../config/convisoConfig';
import { AutoImportService } from '../services/autoImportService';
import { IntegrationService } from '../services/integrationService';
import { inMemoryStore } from '../store/inMemoryStore';
import { createAutoImportRoutes } from './autoImportRoutes';

jest.mock('../store/inMemoryStore');

describe('createAutoImportRoutes', () => {
  let app: Express;
  let mockIntegrationService: jest.Mocked<IntegrationService>;
  let mockAutoImportService: jest.Mocked<AutoImportService>;
  let mockConfig: ConvisoConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    app = express();
    app.use(express.json());

    mockIntegrationService = {
      getIntegration: jest.fn(),
      updateAutoImportSetting: jest.fn(),
    } as any;

    mockAutoImportService = {
      checkAndImportNewEntities: jest.fn().mockResolvedValue({
        imported: 0,
        errors: [],
      }),
    } as any;

    mockConfig = {
      apiBase: 'https://api.test.com',
      apiKey: 'test-api-key',
      environment: 'test',
      companyId: 123,
    };

    const router = createAutoImportRoutes(
      mockIntegrationService,
      mockAutoImportService,
      mockConfig
    );
    app.use('/api/conviso', router);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('POST /auto-import', () => {
    it('should enable auto-import with instanceId and enabled', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockReturnValue(undefined);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(123);
      mockIntegrationService.getIntegration.mockResolvedValue({
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      } as any);

      const response = await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: true,
        })
        .expect(200);

      expect(response.body).toEqual({ success: true, enabled: true });
      expect(inMemoryStore.setAutoImportSetting).toHaveBeenCalledWith('instance-1', true);
    });

    it('should disable auto-import', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: false,
        })
        .expect(200);

      expect(response.body).toEqual({ success: true, enabled: false });
    });

    it('should return 400 when instanceId is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/auto-import')
        .send({
          enabled: true,
        })
        .expect(400);

      expect(response.body.error).toBe('instanceId and enabled are required');
    });

    it('should return 400 when enabled is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
        })
        .expect(400);

      expect(response.body.error).toBe('instanceId and enabled are required');
    });

    it('should store companyId when provided', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockReturnValue(undefined);
      (inMemoryStore.setCompanyId as jest.Mock).mockReturnValue(undefined);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(456);

      await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: true,
          companyId: 456,
        })
        .expect(200);

      expect(inMemoryStore.setCompanyId).toHaveBeenCalledWith('instance-1', 456);
    });

    it('should update integration when companyId is available', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockReturnValue(undefined);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(123);
      mockIntegrationService.getIntegration.mockResolvedValue({
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      } as any);
      mockIntegrationService.updateAutoImportSetting.mockResolvedValue(undefined);

      await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: true,
        })
        .expect(200);

      expect(mockIntegrationService.updateAutoImportSetting).toHaveBeenCalledWith({
        companyId: 123,
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
        autoImportEnabled: true,
      });
    });

    it('should trigger auto-import when enabled', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockReturnValue(undefined);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(123);
      mockAutoImportService.checkAndImportNewEntities.mockResolvedValue({
        imported: 0,
        errors: [],
      });

      await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: true,
        })
        .expect(200);

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockAutoImportService.checkAndImportNewEntities).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (inMemoryStore.setAutoImportSetting as jest.Mock).mockImplementation(() => {
        throw new Error('Store error');
      });

      const response = await request(app)
        .post('/api/conviso/auto-import')
        .send({
          instanceId: 'instance-1',
          enabled: true,
        })
        .expect(500);

      expect(response.body.error).toBe('Store error');
    });
  });

  describe('GET /auto-import/:instanceId', () => {
    it('should return auto-import setting', async () => {
      (inMemoryStore.getAutoImportSetting as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .get('/api/conviso/auto-import/instance-1')
        .expect(200);

      expect(response.body).toEqual({ enabled: true });
      expect(inMemoryStore.getAutoImportSetting).toHaveBeenCalledWith('instance-1');
    });

    it('should return false when setting is not found', async () => {
      (inMemoryStore.getAutoImportSetting as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/conviso/auto-import/instance-1')
        .expect(200);

      expect(response.body).toEqual({ enabled: false });
    });
  });

  describe('POST /trigger-auto-import', () => {
    it('should trigger auto-import and return results', async () => {
      mockAutoImportService.checkAndImportNewEntities.mockResolvedValue({
        imported: 5,
        errors: [],
      });

      const response = await request(app)
        .post('/api/conviso/trigger-auto-import')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        imported: 5,
        errors: [],
        message: expect.stringContaining('Successfully imported 5'),
        timestamp: expect.any(String),
      });
    });

    it('should return message when no entities are imported', async () => {
      mockAutoImportService.checkAndImportNewEntities.mockResolvedValue({
        imported: 0,
        errors: ['Error 1'],
      });

      const response = await request(app)
        .post('/api/conviso/trigger-auto-import')
        .expect(200);

      expect(response.body.message).toContain('No new entities found');
      expect(response.body.message).toContain('1 error(s)');
    });

    it('should handle errors', async () => {
      mockAutoImportService.checkAndImportNewEntities.mockRejectedValue(
        new Error('Import failed')
      );

      const response = await request(app)
        .post('/api/conviso/trigger-auto-import')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Import failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('POST /test-auto-import', () => {
    it('should trigger auto-import and return results', async () => {
      mockAutoImportService.checkAndImportNewEntities.mockResolvedValue({
        imported: 3,
        errors: ['Error 1'],
      });

      const response = await request(app)
        .post('/api/conviso/test-auto-import')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        imported: 3,
        errors: ['Error 1'],
        message: 'Imported 3 new entity(ies). 1 error(s) occurred.',
      });
    });

    it('should handle errors', async () => {
      mockAutoImportService.checkAndImportNewEntities.mockRejectedValue(
        new Error('Test failed')
      );

      const response = await request(app)
        .post('/api/conviso/test-auto-import')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Test failed',
      });
    });
  });
});

