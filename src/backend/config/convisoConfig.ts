import type { Config } from '@backstage/config';

export interface ConvisoConfig {
  apiBase: string;
  apiKey: string;
  environment: string;
  companyId?: number;
}

export function getConvisoConfig(rootConfig?: Config): ConvisoConfig {
  const getConfigValue = (key: string, defaultValue?: string): string | undefined => {
    if (rootConfig) {
      try {
        if (key === 'companyId') {
          const numberValue = rootConfig.getOptionalNumber(`conviso.${key}`);
          if (numberValue !== undefined) {
            return numberValue.toString();
          }
          const stringValue = rootConfig.getOptionalString(`conviso.${key}`);
          if (stringValue !== undefined) {
            return stringValue;
          }
        } else {
          const stringValue = rootConfig.getOptionalString(`conviso.${key}`);
          if (stringValue !== undefined) {
            return stringValue;
          }
        }
      } catch (error) {
        console.error('[Conviso] Error getting config value for key:', key, error);
      }
    }
    return process.env[`CONVISO_${key.toUpperCase().replace(/\./g, '_')}`] || defaultValue;
  };

  const environment = getConfigValue('environment') || process.env['CONVISO_ENVIRONMENT'] || 'production';
  
  let apiBase: string;
  
  if (environment === 'staging') {
    apiBase = 'https://api.staging.convisoappsec.com';
  } else if (environment === 'local') {
    apiBase = getConfigValue('apiBase') || process.env['CONVISO_API_BASE'] || '';
    if (!apiBase) {
      throw new Error('CONVISO_API_BASE is required when CONVISO_ENVIRONMENT=local');
    }
  } else {
    apiBase = 'https://api.convisoappsec.com';
  }
  
  const apiKey = getConfigValue('apiKey') || process.env['CONVISO_API_KEY'] || '';
  
  let companyId: number | undefined;
  
  // Try to get from environment variable first (most reliable)
  const envCompanyId = process.env['CONVISO_COMPANY_ID'];
  if (envCompanyId) {
    const parsed = parseInt(envCompanyId, 10);
    if (!isNaN(parsed)) {
      companyId = parsed;
    }
  }
  
  // If not found in env, try from rootConfig
  if (companyId === undefined && rootConfig) {
    try {
      companyId = rootConfig.getOptionalNumber('conviso.companyId');
      if (companyId === undefined) {
        const companyIdStr = rootConfig.getOptionalString('conviso.companyId');
        if (companyIdStr) {
          // Check if it's a placeholder that wasn't substituted
          if (companyIdStr.startsWith('${') && companyIdStr.endsWith('}')) {
            // Placeholder not substituted, use env fallback
            if (envCompanyId) {
              const parsed = parseInt(envCompanyId, 10);
              if (!isNaN(parsed)) {
                companyId = parsed;
              }
            }
          } else {
            const parsed = parseInt(companyIdStr, 10);
            if (!isNaN(parsed)) {
              companyId = parsed;
            }
          }
        }
      }
    } catch (error) {
      console.error('[Conviso] Error getting companyId from config:', error);
    }
  }

  const config: ConvisoConfig = {
    apiBase,
    apiKey,
    environment,
  };
  
  if (companyId !== undefined) {
    config.companyId = companyId;
  }
  
  return config;
}

