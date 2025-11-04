import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';
import { getConvisoConfig } from './config/convisoConfig';
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
      },
      async init({ httpRouter, catalogApi, auth }) {
        const router = express.Router();
        const config = getConvisoConfig();

        router.use(express.json());

        const apiService = new ConvisoApiService(config);
        const integrationService = new IntegrationService(apiService);
        const assetService = new AssetService(apiService);
        const autoImportService = new AutoImportService(
          assetService,
          apiService,
          catalogApi,
          auth
        );

        router.use(createIntegrationRoutes(integrationService, config));
        router.use(createAutoImportRoutes(integrationService, autoImportService));
        router.use(createImportRoutes(assetService, config));

        const pollingInterval = config.environment === 'production' 
          ? 60 * 60 * 1000
          : 30 * 1000;

        const runPollingCycle = async () => {
          await autoImportService.checkAndImportNewEntities();
        };

        setTimeout(() => {
          runPollingCycle();
        }, 5000);

        setInterval(() => {
          runPollingCycle();
        }, pollingInterval);

        httpRouter.use(router);
      },
    });
  },
});

export default convisoBackendPlugin;
