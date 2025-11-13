import express from 'express';
import { ConvisoConfig } from '../config/convisoConfig';
import { IntegrationService } from '../services/integrationService';
import { inMemoryStore } from '../store/inMemoryStore';

export function createIntegrationRoutes(
  integrationService: IntegrationService,
  config: ConvisoConfig
): express.Router {
  const router = express.Router();

  router.get('/integration/:instanceId', async (req, res) => {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(400).json({ error: 'instanceId is required' });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY as environment variable.' });
      }

      const integration = await integrationService.getIntegration(instanceId);

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const companyId = inMemoryStore.getCompanyId(instanceId) || config.companyId;
      
      if (companyId) {
        return res.json({ integration, companyId });
      }
      
      return res.json({ integration });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/integration', async (req, res) => {
    try {
      const { companyId: companyIdFromBody, backstageUrl, instanceId } = req.body;

      if (!backstageUrl || !instanceId) {
        return res.status(400).json({ error: 'backstageUrl and instanceId are required' });
      }

      const companyId = companyIdFromBody 
        ? parseInt(companyIdFromBody.toString(), 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID as environment variable or provide it in the request body.' 
        });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY as environment variable.' });
      }

      const result = await integrationService.createOrUpdateIntegration({
        companyId,
        backstageUrl,
        instanceId,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.get('/config', async (_req, res) => {
    try {
      // Read companyId directly from process.env as fallback (same logic as createOrUpdateIntegration)
      let companyId = config.companyId;
      if (!companyId) {
        const envCompanyId = process.env['CONVISO_COMPANY_ID'];
        if (envCompanyId) {
          const parsed = parseInt(envCompanyId, 10);
          if (!isNaN(parsed)) {
            companyId = parsed;
          }
        }
      }
      
      const response: {
        environment: string;
        platformUrl: string;
        companyId?: number;
      } = {
        environment: config.environment,
        platformUrl: config.environment === 'staging' 
          ? 'https://staging.convisoappsec.com/'
          : 'https://app.convisoappsec.com/',
      };
      
      if (companyId !== undefined) {
        response.companyId = companyId;
      }
      
      return res.json(response);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return router;
}

