export interface ConvisoConfig {
  apiBase: string;
  apiKey: string;
  environment: string;
}

export function getConvisoConfig(): ConvisoConfig {
  const environment = process.env['CONVISO_ENVIRONMENT'] || process.env['CONVISO_ENV'] || 'staging';
  
  let apiBase = process.env['CONVISO_API_BASE'] 
    || process.env['CONVISO_API_BASE_STAGING'] 
    || 'https://api.staging.convisoappsec.com';
  
  if (environment === 'production') {
    apiBase = process.env['CONVISO_API_BASE_PRODUCTION'] || 'https://api.convisoappsec.com';
  }
  
  const apiKey = process.env['CONVISO_API_KEY'] || '';

  return {
    apiBase,
    apiKey,
    environment,
  };
}

