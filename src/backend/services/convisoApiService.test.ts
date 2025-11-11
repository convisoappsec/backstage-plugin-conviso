import { ConvisoConfig } from '../config/convisoConfig';
import { ConvisoApiService } from './convisoApiService';

describe('ConvisoApiService', () => {
  let service: ConvisoApiService;
  let mockFetch: jest.Mock;

  const mockConfig: ConvisoConfig = {
    apiBase: 'https://api.test.convisoappsec.com',
    apiKey: 'test-api-key',
    environment: 'test',
  };

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;
    service = new ConvisoApiService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should make GraphQL request with correct headers', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: jest.fn().mockResolvedValue({
          data: { test: 'data' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await service.request({
        query: 'query { test }',
        variables: { id: '123' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.convisoappsec.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
            'skip_zrok_interstitial': '1',
          },
          body: JSON.stringify({
            query: 'query { test }',
            variables: { id: '123' },
          }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return data from successful response', async () => {
      const mockData = { test: 'result' };
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: jest.fn().mockResolvedValue({
          data: mockData,
        }),
      });

      const result = await service.request({
        query: 'query { test }',
      });

      expect(result).toEqual(mockData);
    });

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new ConvisoApiService({
        ...mockConfig,
        apiKey: '',
      });

      await expect(
        serviceWithoutKey.request({
          query: 'query { test }',
        })
      ).rejects.toThrow('API Key not configured');
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({
          'content-type': 'text/plain',
        }),
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      await expect(
        service.request({
          query: 'query { test }',
        })
      ).rejects.toThrow('GraphQL request failed (500 Internal Server Error)');
    });

    it('should throw error when GraphQL response contains errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'GraphQL error occurred' }],
        }),
      });

      await expect(
        service.request({
          query: 'query { test }',
        })
      ).rejects.toThrow('GraphQL error occurred');
    });

    it('should throw error when response has no data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        service.request({
          query: 'query { test }',
        })
      ).rejects.toThrow('No data in GraphQL response');
    });
  });
});

