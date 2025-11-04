export interface ConvisoConfig {
  apiBase: string;
  apiKey: string;
  environment: string;
  companyId?: number;
}

export function getConvisoConfig(): ConvisoConfig {
  const environment = process.env['CONVISO_ENVIRONMENT'] || 'production';
  
  let apiBase: string;
  
  if (environment === 'staging') {
    apiBase = 'https://api.staging.convisoappsec.com';
  } else if (environment === 'local') {
    apiBase = process.env['CONVISO_API_BASE'] || '';
    if (!apiBase) {
      throw new Error('CONVISO_API_BASE is required when CONVISO_ENV=local');
    }
  } else {
    apiBase = 'https://api.convisoappsec.com';
  }
  
  const apiKey = process.env['CONVISO_API_KEY'] || '';
  
  const companyIdEnv = process.env['CONVISO_COMPANY_ID'];
  const companyId = companyIdEnv ? parseInt(companyIdEnv, 10) : undefined;

  return {
    apiBase,
    apiKey,
    environment,
    companyId,
  };
}

