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
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const integration = await integrationService.getIntegration(instanceId);

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const companyId = inMemoryStore.getCompanyId(instanceId);
      
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
      const { companyId, backstageUrl, instanceId } = req.body;

      if (!backstageUrl || !instanceId) {
        return res.status(400).json({ error: 'backstageUrl and instanceId are required' });
      }

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const result = await integrationService.createOrUpdateIntegration({
        companyId: parseInt(companyId.toString(), 10),
        backstageUrl,
        instanceId,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return router;
}

