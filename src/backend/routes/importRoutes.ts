import express from 'express';
import { ConvisoConfig } from '../config/convisoConfig';
import { AssetService } from '../services/assetService';

export function createImportRoutes(
  assetService: AssetService,
  config: ConvisoConfig
): express.Router {
  const router = express.Router();

  router.get('/imported-assets/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const assets = await assetService.getImportedAssets(parseInt(companyId, 10));

      return res.json({
        assets: assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/import-projects', async (req, res) => {
    try {
      const { companyId, projects } = req.body;

      if (!projects || !Array.isArray(projects)) {
        return res.status(400).json({ error: 'projects array is required' });
      }

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const result = await assetService.importProjects({
        companyId: parseInt(companyId.toString(), 10),
        projects,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return router;
}

