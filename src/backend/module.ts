import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';
import { getConvisoConfig } from './config/convisoConfig';
import { POLLING_INTERVALS } from './constants';
import { createAutoImportRoutes } from './routes/autoImportRoutes';
import { createImportRoutes } from './routes/importRoutes';
import { createIntegrationRoutes } from './routes/integrationRoutes';
import { AssetCacheService } from './services/assetCacheService';
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
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, catalogApi, auth, logger, config: rootConfig }) {
        const router = express.Router();
        const config = getConvisoConfig(rootConfig);
        
        // Log config for debugging
        logger.info('Conviso config loaded', {
          companyId: config.companyId,
          environment: config.environment,
          apiBase: config.apiBase,
          hasApiKey: !!config.apiKey,
        });

        router.use(express.json());

        const apiService = new ConvisoApiService(config);
        const integrationService = new IntegrationService(apiService);
        const assetService = new AssetService(apiService);
        const assetCacheService = new AssetCacheService(assetService, logger);
        const autoImportService = new AutoImportService(
          assetService,
          assetCacheService,
          catalogApi,
          auth,
          config,
          logger
        );

        router.use(createIntegrationRoutes(integrationService, config));
        router.use(createAutoImportRoutes(integrationService, autoImportService, config));
        router.use(createImportRoutes(assetService, assetCacheService, config));

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

        const scheduleDailyAt1AM = () => {
          const now = new Date();
          const next1AM = new Date();
          next1AM.setHours(1, 0, 0, 0);

          if (now.getHours() >= 1) {
            next1AM.setDate(next1AM.getDate() + 1);
          }

          const msUntil1AM = next1AM.getTime() - now.getTime();

          logger.info('Scheduling auto-import to run daily at 1:00 AM', {
            nextRun: next1AM.toISOString(),
            msUntilNextRun: msUntil1AM,
          });

          setTimeout(() => {
            runPollingCycle();

            setInterval(() => {
              runPollingCycle();
            }, POLLING_INTERVALS.PRODUCTION_MS);
          }, msUntil1AM);
        };

        const scheduleDailyCacheSync = () => {
          const now = new Date();
          const next12_50AM = new Date();
          next12_50AM.setHours(0, 50, 0, 0);

          if (now.getHours() > 0 || (now.getHours() === 0 && now.getMinutes() >= 50)) {
            next12_50AM.setDate(next12_50AM.getDate() + 1);
          }

          const msUntil12_50AM = next12_50AM.getTime() - now.getTime();

          logger.info('Scheduling cache sync to run daily at 12:50 AM (10 minutes before auto-import)', {
            nextRun: next12_50AM.toISOString(),
            msUntilNextRun: msUntil12_50AM,
          });

          const syncCache = async () => {
            try {
              if (config.companyId) {
                logger.info('Starting daily cache sync', { companyId: config.companyId });
                await assetCacheService.sync(config.companyId, true);
                logger.info('Daily cache sync completed', { companyId: config.companyId });
              } else {
                logger.warn('Skipping cache sync: no companyId configured');
              }
            } catch (error: any) {
              logger.error('Daily cache sync failed', {
                error: error.message,
                stack: error.stack,
              });
            }
          };

          setTimeout(() => {
            syncCache();

            setInterval(() => {
              syncCache();
            }, 24 * 60 * 60 * 1000);
          }, msUntil12_50AM);
        };

        scheduleDailyCacheSync();
        scheduleDailyAt1AM();

        const initialCacheSync = async () => {
          try {
            if (config.companyId) {
              logger.info('Starting initial cache sync on plugin startup', { 
                companyId: config.companyId 
              });
              await assetCacheService.sync(config.companyId, true);
              logger.info('Initial cache sync completed', { 
                companyId: config.companyId,
                cacheSize: assetCacheService.getCache(config.companyId)?.totalCount || 0,
              });
            } else {
              logger.warn('Skipping initial cache sync: no companyId configured');
            }
          } catch (error: any) {
            logger.error('Initial cache sync failed', {
              error: error.message,
              stack: error.stack,
            });
          }
        };

        initialCacheSync();

        httpRouter.use(router);
      },
    });
  },
});

export default convisoBackendPlugin;
