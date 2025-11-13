import express from 'express';
import { ConvisoConfig } from '../config/convisoConfig';
import { AutoImportService } from '../services/autoImportService';
import { IntegrationService } from '../services/integrationService';
import { inMemoryStore } from '../store/inMemoryStore';

export function createAutoImportRoutes(
  integrationService: IntegrationService,
  autoImportService: AutoImportService,
  config: ConvisoConfig
): express.Router {
  const router = express.Router();

  router.post('/auto-import', async (req: express.Request, res: express.Response) => {
    try {
      const { instanceId, enabled, companyId: companyIdFromRequest } = req.body;

      if (instanceId === undefined || enabled === undefined) {
        return res.status(400).json({ error: 'instanceId and enabled are required' });
      }

      inMemoryStore.setAutoImportSetting(instanceId, enabled);

      let companyId: number | undefined = companyIdFromRequest
        ? parseInt(companyIdFromRequest.toString(), 10)
        : inMemoryStore.getCompanyId(instanceId) || config.companyId;

      if (companyIdFromRequest && companyId !== undefined) {
        inMemoryStore.setCompanyId(instanceId, companyId);
      }

      if (companyId) {
        try {
          const integration = await integrationService.getIntegration(instanceId);
          if (integration) {
            await integrationService.updateAutoImportSetting({
              companyId,
              backstageUrl: integration.backstageUrl,
              instanceId,
              autoImportEnabled: enabled,
            });
          }
        } catch {
        }
      }

      if (enabled) {
        let currentCompanyId = inMemoryStore.getCompanyId(instanceId) || config.companyId;

        if (!currentCompanyId) {
          try {
            const integration = await integrationService.getIntegration(instanceId);
            if (integration) {
              currentCompanyId = inMemoryStore.getCompanyId(instanceId) || config.companyId;
            }
          } catch {
          }
        }

        if (currentCompanyId) {
          setTimeout(() => {
            autoImportService.checkAndImportNewEntities().catch(() => {
            });
          }, 1000);
        }
      }

      return res.json({ success: true, enabled });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.get('/auto-import/:instanceId', async (req: express.Request, res: express.Response) => {
    try {
      const { instanceId } = req.params;
      if (!instanceId) {
        return res.status(400).json({ error: 'instanceId is required' });
      }
      const enabled = inMemoryStore.getAutoImportSetting(instanceId) || false;

      return res.json({ enabled });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  router.post('/trigger-auto-import', async (_req: express.Request, res: express.Response) => {
    try {
      const results = await autoImportService.checkAndImportNewEntities();

      return res.json({
        success: true,
        imported: results.imported,
        errors: results.errors,
        message:
          results.imported > 0
            ? `✅ Successfully imported ${results.imported} new entity(ies) immediately!`
            : `ℹ️ No new entities found to import. ${results.errors.length} error(s) occurred.`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/test-auto-import', async (_req: express.Request, res: express.Response) => {
    try {
      const results = await autoImportService.checkAndImportNewEntities();

      return res.json({
        success: true,
        imported: results.imported,
        errors: results.errors,
        message: `Imported ${results.imported} new entity(ies). ${results.errors.length} error(s) occurred.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  return router;
}

