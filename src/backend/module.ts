import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';
import { getConvisoConfig } from './config/convisoConfig';
import { POLLING_INTERVALS } from './constants';
import { createAutoImportRoutes } from './routes/autoImportRoutes';
import { createImportRoutes } from './routes/importRoutes';
import { createIntegrationRoutes } from './routes/integrationRoutes';
import { AssetService } from './services/assetService';
import { AutoImportService } from './services/autoImportService';
import { ConvisoApiService } from './services/convisoApiService';
import { IntegrationService } from './services/integrationService';

export const convisoBackendPlugin = createBackendPlugin({
  pluginId: 'conviso',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        catalogApi: catalogServiceRef,
        auth: coreServices.auth,
        logger: coreServices.logger,
      },
      async init({ httpRouter, catalogApi, auth, logger }) {
        const router = express.Router();
        const config = getConvisoConfig();

        router.use(express.json());

        const apiService = new ConvisoApiService(config);
        const integrationService = new IntegrationService(apiService);
        const assetService = new AssetService(apiService);
        const autoImportService = new AutoImportService(
          assetService,
          catalogApi,
          auth,
          config,
          logger
        );

        router.use(createIntegrationRoutes(integrationService, config));
        router.use(createAutoImportRoutes(integrationService, autoImportService, config));
        router.use(createImportRoutes(assetService, config));

        const pollingInterval =
          config.environment === 'production'
            ? POLLING_INTERVALS.PRODUCTION_MS
            : POLLING_INTERVALS.DEVELOPMENT_MS;

        const runPollingCycle = async () => {
          try {
            const result = await autoImportService.checkAndImportNewEntities();
            if (result.errors.length > 0) {
              logger.warn(`Auto-import completed with ${result.errors.length} errors`, {
                imported: result.imported,
                errors: result.errors,
              });
            } else if (result.imported > 0) {
              logger.info(`Auto-import completed successfully: ${result.imported} entities imported`);
            }
          } catch (error: any) {
            logger.error('Auto-import polling cycle failed', {
              error: error.message,
              stack: error.stack,
            });
          }
        };

        setTimeout(() => {
          runPollingCycle();
        }, POLLING_INTERVALS.INITIAL_DELAY_MS);

        setInterval(() => {
          runPollingCycle();
        }, pollingInterval);

        httpRouter.use(router);
      },
    });
  },
});

export default convisoBackendPlugin;
