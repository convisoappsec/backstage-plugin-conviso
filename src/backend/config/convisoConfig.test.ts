import { getConvisoConfig } from './convisoConfig';

describe('getConvisoConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return production config by default', () => {
    delete process.env.CONVISO_ENVIRONMENT;
    delete process.env.CONVISO_API_KEY;
    delete process.env.CONVISO_COMPANY_ID;

    const config = getConvisoConfig();

    expect(config.apiBase).toBe('https://api.convisoappsec.com');
    expect(config.environment).toBe('production');
    expect(config.apiKey).toBe('');
    expect(config.companyId).toBeUndefined();
  });

  it('should return staging config when CONVISO_ENVIRONMENT is staging', () => {
    process.env.CONVISO_ENVIRONMENT = 'staging';
    process.env.CONVISO_API_KEY = 'staging-key';
    process.env.CONVISO_COMPANY_ID = '456';

    const config = getConvisoConfig();

    expect(config.apiBase).toBe('https://api.staging.convisoappsec.com');
    expect(config.environment).toBe('staging');
    expect(config.apiKey).toBe('staging-key');
    expect(config.companyId).toBe(456);
  });

  it('should return local config when CONVISO_ENVIRONMENT is local', () => {
    process.env.CONVISO_ENVIRONMENT = 'local';
    process.env.CONVISO_API_BASE = 'http://localhost:3000';
    process.env.CONVISO_API_KEY = 'local-key';
    process.env.CONVISO_COMPANY_ID = '789';

    const config = getConvisoConfig();

    expect(config.apiBase).toBe('http://localhost:3000');
    expect(config.environment).toBe('local');
    expect(config.apiKey).toBe('local-key');
    expect(config.companyId).toBe(789);
  });

  it('should throw error when CONVISO_ENVIRONMENT is local but CONVISO_API_BASE is missing', () => {
    process.env.CONVISO_ENVIRONMENT = 'local';
    delete process.env.CONVISO_API_BASE;

    expect(() => getConvisoConfig()).toThrow('CONVISO_API_BASE is required when CONVISO_ENVIRONMENT=local');
  });

  it('should parse companyId as integer', () => {
    process.env.CONVISO_COMPANY_ID = '123';

    const config = getConvisoConfig();

    expect(config.companyId).toBe(123);
    expect(typeof config.companyId).toBe('number');
  });

  it('should handle invalid companyId gracefully', () => {
    process.env.CONVISO_COMPANY_ID = 'invalid';

    const config = getConvisoConfig();

    expect(config.companyId).toBeUndefined();
  });

  it('should return empty apiKey when not set', () => {
    delete process.env.CONVISO_API_KEY;

    const config = getConvisoConfig();

    expect(config.apiKey).toBe('');
  });

  it('should return undefined companyId when not set', () => {
    delete process.env.CONVISO_COMPANY_ID;

    const config = getConvisoConfig();

    expect(config.companyId).toBeUndefined();
  });
});

