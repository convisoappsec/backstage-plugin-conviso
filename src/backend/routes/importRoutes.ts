import express from 'express';
import { ConvisoConfig } from '../config/convisoConfig';
import { AssetCacheService } from '../services/assetCacheService';
import { AssetService } from '../services/assetService';

export function createImportRoutes(
  assetService: AssetService,
  assetCacheService: AssetCacheService,
  config: ConvisoConfig
): express.Router {
  const router = express.Router();

  router.get('/imported-assets/:companyId?', async (req, res) => {
    const companyIdFromParam = req.params.companyId;
    
    try {
      const companyId = companyIdFromParam 
        ? parseInt(companyIdFromParam, 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the URL.' 
        });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const assets = await assetService.getImportedAssets(companyId);

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

  router.post('/check-imported-names', async (req, res) => {
    try {
      const { companyId: companyIdFromBody, names } = req.body;

      if (!names || !Array.isArray(names)) {
        return res.status(400).json({ error: 'names array is required' });
      }

      const companyId = companyIdFromBody 
        ? parseInt(companyIdFromBody.toString(), 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the request body.' 
        });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const foundNames = assetCacheService.checkNames(companyId, names);

      return res.json({
        importedNames: Array.from(foundNames),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.get('/imported-assets-cache/:companyId?', async (req, res) => {
    const companyIdFromParam = req.params.companyId;
    
    try {
      const companyId = companyIdFromParam 
        ? parseInt(companyIdFromParam, 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the URL.' 
        });
      }

      const cache = assetCacheService.getCache(companyId);

      if (!cache) {
        return res.status(404).json({ 
          error: 'Cache not found. Please sync first using /sync-imported-assets endpoint.' 
        });
      }

      return res.json(cache);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/sync-imported-assets/:companyId?', async (req, res) => {
    const companyIdFromParam = req.params.companyId;
    const force = req.body.force === true;
    
    try {
      const companyId = companyIdFromParam 
        ? parseInt(companyIdFromParam, 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the URL.' 
        });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const result = await assetCacheService.sync(companyId, force);

      return res.json({
        success: true,
        synced: result.synced,
        duration: `${(result.duration / 1000).toFixed(2)}s`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/import-projects', async (req, res) => {
    try {
      const { companyId: companyIdFromBody, projects } = req.body;

      if (!projects || !Array.isArray(projects)) {
        return res.status(400).json({ error: 'projects array is required' });
      }

      const companyId = companyIdFromBody 
        ? parseInt(companyIdFromBody.toString(), 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the request body.' 
        });
      }

      if (!config.apiKey) {
        return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
      }

      const result = await assetService.importProjects({
        companyId,
        projects,
      });

      if (result.success && result.importedCount > 0) {
        const importedNames = projects
          .slice(0, result.importedCount)
          .map(project => project.name)
          .filter((name): name is string => !!name);
        
        assetCacheService.addNames(companyId, importedNames);
      }

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/add-imported-names', async (req, res) => {
    try {
      const { companyId: companyIdFromBody, names } = req.body;

      if (!names || !Array.isArray(names)) {
        return res.status(400).json({ error: 'names array is required' });
      }

      const companyId = companyIdFromBody 
        ? parseInt(companyIdFromBody.toString(), 10)
        : config.companyId;

      if (!companyId) {
        return res.status(400).json({ 
          error: 'Company ID is required. Set CONVISO_COMPANY_ID in .env file or provide it in the request body.' 
        });
      }

      assetCacheService.addNames(companyId, names);

      return res.json({
        success: true,
        added: names.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return router;
}

