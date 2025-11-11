import express, { Express } from 'express';
import request from 'supertest';
import { ConvisoConfig } from '../config/convisoConfig';
import { IntegrationService } from '../services/integrationService';
import { inMemoryStore } from '../store/inMemoryStore';
import { createIntegrationRoutes } from './integrationRoutes';

jest.mock('../store/inMemoryStore');

describe('createIntegrationRoutes', () => {
  let app: Express;
  let mockIntegrationService: jest.Mocked<IntegrationService>;
  let mockConfig: ConvisoConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    mockIntegrationService = {
      getIntegration: jest.fn(),
      createOrUpdateIntegration: jest.fn(),
    } as any;

    mockConfig = {
      apiBase: 'https://api.test.com',
      apiKey: 'test-api-key',
      environment: 'test',
      companyId: 123,
    };

    const router = createIntegrationRoutes(mockIntegrationService, mockConfig);
    app.use('/api/conviso', router);
  });

  describe('GET /integration/:instanceId', () => {
    it('should return integration with companyId', async () => {
      const mockIntegration = {
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      };

      mockIntegrationService.getIntegration.mockResolvedValue(mockIntegration as any);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(456);

      const response = await request(app)
        .get('/api/conviso/integration/instance-1')
        .expect(200);

      expect(response.body).toEqual({
        integration: mockIntegration,
        companyId: 456,
      });
      expect(mockIntegrationService.getIntegration).toHaveBeenCalledWith('instance-1');
    });

    it('should return integration without companyId when not found in store or config', async () => {
      const mockIntegration = {
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      };

      const configWithoutCompanyId: ConvisoConfig = {
        ...mockConfig,
        companyId: undefined,
      };

      const router = createIntegrationRoutes(mockIntegrationService, configWithoutCompanyId);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      mockIntegrationService.getIntegration.mockResolvedValue(mockIntegration as any);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(undefined);

      const response = await request(testApp)
        .get('/api/conviso/integration/instance-1')
        .expect(200);

      expect(response.body).toEqual({
        integration: mockIntegration,
      });
    });

    it('should use companyId from config when not in store', async () => {
      const mockIntegration = {
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      };

      mockIntegrationService.getIntegration.mockResolvedValue(mockIntegration as any);
      (inMemoryStore.getCompanyId as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/conviso/integration/instance-1')
        .expect(200);

      expect(response.body.companyId).toBe(123);
    });

    it('should return 404 when route does not match', async () => {
      const response = await request(app)
        .get('/api/conviso/integration')
        .expect(404);

      expect(response.body).toBeDefined();
    });

    it('should return 404 when integration is not found', async () => {
      mockIntegrationService.getIntegration.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conviso/integration/instance-1')
        .expect(404);

      expect(response.body.error).toBe('Integration not found');
    });

    it('should return 500 when API key is not configured', async () => {
      const configWithoutApiKey: ConvisoConfig = {
        ...mockConfig,
        apiKey: '',
      };

      const router = createIntegrationRoutes(mockIntegrationService, configWithoutApiKey);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      const response = await request(testApp)
        .get('/api/conviso/integration/instance-1')
        .expect(500);

      expect(response.body.error).toContain('API Key not configured');
    });

    it('should handle errors', async () => {
      mockIntegrationService.getIntegration.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/conviso/integration/instance-1')
        .expect(500);

      expect(response.body.error).toBe('Service error');
    });
  });

  describe('POST /integration', () => {
    it('should create or update integration with companyId from body', async () => {
      const mockResult = {
        id: 'integration-1',
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      };

      mockIntegrationService.createOrUpdateIntegration.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post('/api/conviso/integration')
        .send({
          companyId: 456,
          backstageUrl: 'https://backstage.test.com',
          instanceId: 'instance-1',
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockIntegrationService.createOrUpdateIntegration).toHaveBeenCalledWith({
        companyId: 456,
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      });
    });

    it('should use companyId from config when not provided in body', async () => {
      const mockResult = {
        id: 'integration-1',
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      };

      mockIntegrationService.createOrUpdateIntegration.mockResolvedValue(mockResult as any);

      await request(app)
        .post('/api/conviso/integration')
        .send({
          backstageUrl: 'https://backstage.test.com',
          instanceId: 'instance-1',
        })
        .expect(200);

      expect(mockIntegrationService.createOrUpdateIntegration).toHaveBeenCalledWith({
        companyId: 123,
        backstageUrl: 'https://backstage.test.com',
        instanceId: 'instance-1',
      });
    });

    it('should return 400 when backstageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/integration')
        .send({
          instanceId: 'instance-1',
        })
        .expect(400);

      expect(response.body.error).toBe('backstageUrl and instanceId are required');
    });

    it('should return 400 when instanceId is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/integration')
        .send({
          backstageUrl: 'https://backstage.test.com',
        })
        .expect(400);

      expect(response.body.error).toBe('backstageUrl and instanceId are required');
    });

    it('should return 400 when companyId is missing', async () => {
      const configWithoutCompanyId: ConvisoConfig = {
        ...mockConfig,
        companyId: undefined,
      };

      const router = createIntegrationRoutes(mockIntegrationService, configWithoutCompanyId);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      const response = await request(testApp)
        .post('/api/conviso/integration')
        .send({
          backstageUrl: 'https://backstage.test.com',
          instanceId: 'instance-1',
        })
        .expect(400);

      expect(response.body.error).toContain('Company ID is required');
    });

    it('should return 500 when API key is not configured', async () => {
      const configWithoutApiKey: ConvisoConfig = {
        ...mockConfig,
        apiKey: '',
      };

      const router = createIntegrationRoutes(mockIntegrationService, configWithoutApiKey);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      const response = await request(testApp)
        .post('/api/conviso/integration')
        .send({
          companyId: 123,
          backstageUrl: 'https://backstage.test.com',
          instanceId: 'instance-1',
        })
        .expect(500);

      expect(response.body.error).toContain('API Key not configured');
    });

    it('should handle errors', async () => {
      mockIntegrationService.createOrUpdateIntegration.mockRejectedValue(
        new Error('Creation failed')
      );

      const response = await request(app)
        .post('/api/conviso/integration')
        .send({
          companyId: 123,
          backstageUrl: 'https://backstage.test.com',
          instanceId: 'instance-1',
        })
        .expect(500);

      expect(response.body.error).toBe('Creation failed');
    });
  });
});

