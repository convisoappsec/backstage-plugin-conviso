import { AuthService, LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { ConvisoConfig } from '../config/convisoConfig';
import { BATCH_PROCESSING, ENTITY_KINDS, PAGINATION } from '../constants';
import { inMemoryStore } from '../store/inMemoryStore';
import { BatchProcessor } from '../utils/batchProcessor';
import { extractProjectDataFromEntity } from '../utils/entityMapper';
import { normalizeEntityName } from '../utils/nameNormalizer';
import { AssetCacheService } from './assetCacheService';
import { AssetService } from './assetService';

export interface AutoImportResult {
  imported: number;
  errors: string[];
}

export class AutoImportService {
  constructor(
    private assetService: AssetService,
    private assetCacheService: AssetCacheService,
    private catalogApi: CatalogService,
    private auth: AuthService,
    private config: ConvisoConfig,
    private logger: LoggerService
  ) {}


  async checkAndImportNewEntities(): Promise<AutoImportResult> {
    const results: AutoImportResult = { imported: 0, errors: [] };

    try {
      this.logger.info('Checking for enabled auto-import instances');
      const enabledInstances = inMemoryStore.getEnabledInstances();

      this.logger.info('Found enabled instances', {
        count: enabledInstances.length,
        instances: enabledInstances.map(i => ({ instanceId: i.instanceId, companyId: i.companyId })),
      });

      if (enabledInstances.length === 0) {
        this.logger.info('No enabled instances found, skipping auto-import');
        return results;
      }

      for (const { instanceId, companyId: companyIdFromStore } of enabledInstances) {
        this.logger.info('Processing instance', { instanceId, companyIdFromStore });
        const instanceResult = await this.processInstance(instanceId, companyIdFromStore);
        results.imported += instanceResult.imported;
        results.errors.push(...instanceResult.errors);
        
        this.logger.info('Instance processing completed', {
          instanceId,
          imported: instanceResult.imported,
          errors: instanceResult.errors.length,
        });
      }
    } catch (error: unknown) {
      const errorMsg = this.getErrorMessage(error, 'Error in catalog check');
      this.logger.error('Error in catalog check', {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      results.errors.push(errorMsg);
    }

    return results;
  }

  private async processInstance(
    instanceId: string,
    companyIdFromStore?: number
  ): Promise<AutoImportResult> {
    const results: AutoImportResult = { imported: 0, errors: [] };

    try {
      const companyId = companyIdFromStore || this.config.companyId;

      if (!companyId) {
        const errorMsg = `No companyId found for instance ${instanceId}. Set CONVISO_COMPANY_ID as environment variable.`;
        results.errors.push(errorMsg);
        return results;
      }

      this.logger.info('Starting auto-import process', {
        instanceId,
        companyId,
      });

      if (this.assetCacheService.isStale(companyId)) {
        this.logger.info('Cache is stale, syncing before auto-import', {
          instanceId,
          companyId,
        });
        try {
          await this.assetCacheService.sync(companyId, false);
        } catch (error: unknown) {
          const errorMsg = this.getErrorMessage(error, 'Error syncing cache');
          this.logger.warn('Cache sync failed, continuing with auto-import', {
            instanceId,
            companyId,
            error: errorMsg,
          });
        }
      }

      this.logger.info('Starting streaming import process with cache-based filtering', {
        instanceId,
        companyId,
        processingBatchSize: PAGINATION.PROCESSING_BATCH_SIZE,
      });

      const importResult = await this.processEntitiesInBatches(companyId);
      
      this.logger.info('Streaming import completed', {
        instanceId,
        companyId,
        imported: importResult.imported,
        errors: importResult.errors.length,
      });
      results.imported = importResult.imported;
      results.errors.push(...importResult.errors);
    } catch (error: unknown) {
      const errorMsg = this.getErrorMessage(error, `Error checking catalog for instance ${instanceId}`);
      this.logger.error('Error checking catalog for instance', {
        instanceId,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      results.errors.push(errorMsg);
    }

    return results;
  }


  private async processEntitiesInBatches(
    companyId: number
  ): Promise<{ imported: number; errors: string[] }> {
    const processingBatchSize = PAGINATION.PROCESSING_BATCH_SIZE;
    const limit = PAGINATION.CATALOG_FETCH_LIMIT;
    let offset = 0;
    let hasMore = true;
    let page = 1;
    let totalImported = 0;
    const allErrors: string[] = [];

    this.logger.info('Starting streaming batch processing', {
      processingBatchSize,
      fetchLimit: limit,
    });

    while (hasMore) {
      const batchEntities: Entity[] = [];
      let batchOffset = offset;

      while (batchEntities.length < processingBatchSize && hasMore) {
        try {
          const response = await this.catalogApi.getEntities(
            {
              filter: { kind: ENTITY_KINDS.COMPONENT },
              fields: [
                'metadata.name',
                'metadata.namespace',
                'metadata.description',
                'metadata.annotations',
                'metadata.tags',
                'metadata.links',
                'spec.type',
                'spec.lifecycle',
                'spec.owner',
                'kind',
                'apiVersion',
              ],
              limit,
              offset: batchOffset,
            },
            { credentials: await this.auth.getOwnServiceCredentials() }
          );

          if (response.items && response.items.length > 0) {
            batchEntities.push(...response.items);
            batchOffset += response.items.length;
            hasMore = response.items.length === limit;

            this.logger.info('Fetched batch page for processing', {
              page,
              itemsInPage: response.items.length,
              batchSize: batchEntities.length,
              totalFetched: offset + batchEntities.length,
              hasMore,
            });

            page++;
          } else {
            hasMore = false;
          }
        } catch (error: unknown) {
          const errorMsg = this.getErrorMessage(error, 'Error fetching batch');
          this.logger.error('Error fetching batch for processing', {
            error: errorMsg,
            page,
            batchOffset,
          });
          allErrors.push(errorMsg);
          hasMore = false;
        }
      }

      if (batchEntities.length === 0) {
        break;
      }

      const entityNames = batchEntities.map(entity => entity.metadata.name).filter((name): name is string => !!name);
      
      this.logger.info('Checking imported status for batch entities using cache', {
        batchSize: batchEntities.length,
        entityNamesCount: entityNames.length,
      });
      
      const importedAssetNames = this.assetCacheService.checkNames(companyId, entityNames);
      
      this.logger.info('Fetched imported status for batch from cache', {
        batchSize: batchEntities.length,
        alreadyImported: importedAssetNames.size,
        toImport: batchEntities.length - importedAssetNames.size,
      });

      const nonImportedEntities = this.filterNonImportedEntities(batchEntities, importedAssetNames);

      this.logger.info('Filtered batch entities', {
        batchSize: batchEntities.length,
        nonImported: nonImportedEntities.length,
        alreadyImported: batchEntities.length - nonImportedEntities.length,
      });

      if (nonImportedEntities.length > 0) {
        this.logger.info('Importing batch of non-imported entities', {
          count: nonImportedEntities.length,
          batchNumber: Math.floor(offset / processingBatchSize) + 1,
        });

        const importResult = await this.importEntities(nonImportedEntities, companyId);
        totalImported += importResult.imported;
        allErrors.push(...importResult.errors);

        if (importResult.imported > 0) {
          const importedNames = nonImportedEntities
            .slice(0, importResult.imported)
            .map(entity => entity.metadata.name)
            .filter((name): name is string => !!name);
          
          this.assetCacheService.addNames(companyId, importedNames);
          
          this.logger.info('Updated cache with newly imported assets', {
            companyId,
            added: importedNames.length,
          });
        }

        this.logger.info('Batch import completed', {
          imported: importResult.imported,
          errors: importResult.errors.length,
          totalImportedSoFar: totalImported,
        });
      } else {
        this.logger.info('Batch has no new entities to import', {
          batchSize: batchEntities.length,
        });
      }

      offset = batchOffset;

      if (batchEntities.length < processingBatchSize) {
        hasMore = false;
      }
    }

    this.logger.info('Completed streaming batch processing', {
      totalImported,
      totalErrors: allErrors.length,
      totalPages: page - 1,
    });

    return { imported: totalImported, errors: allErrors };
  }

  private filterNonImportedEntities(
    entities: Entity[],
    importedAssetNames: Set<string>
  ): Entity[] {
    return entities.filter((entity) => {
      const entityName = normalizeEntityName(entity.metadata.name);
      return !importedAssetNames.has(entityName);
    });
  }

  private async importEntities(
    entities: Entity[],
    companyId: number
  ): Promise<{ imported: number; errors: string[] }> {
    const batchSize = BATCH_PROCESSING.IMPORT_BATCH_SIZE;
    const totalBatches = Math.ceil(entities.length / batchSize);

    this.logger.info('Starting batch import of entities', {
      totalEntities: entities.length,
      batchSize,
      totalBatches,
    });

    const { results, errors } = await BatchProcessor.processInBatches(
      entities,
      batchSize,
      async (batch: Entity[]) => {
        try {
          const projectData = batch
            .map((entity) => extractProjectDataFromEntity(entity))
            .filter((data): data is NonNullable<typeof data> => data !== null && data !== undefined);

          if (projectData.length === 0) {
            this.logger.warn('Batch has no valid project data', {
              batchSize: batch.length,
            });
            return [];
          }

          this.logger.info('Sending batch to Kafka via GraphQL', {
            batchSize: projectData.length,
            companyId,
            firstProject: projectData[0]?.name,
            lastProject: projectData[projectData.length - 1]?.name,
            projectNames: projectData.map(p => p.name).slice(0, 10),
          });

          const importResult = await this.assetService.importProjects({
            companyId,
            projects: projectData,
          });

          this.logger.info('Batch sent to Kafka successfully via GraphQL', {
            batchSize: projectData.length,
            success: importResult.success,
            importedCount: importResult.importedCount,
            errors: importResult.errors?.length || 0,
            errorDetails: importResult.errors?.slice(0, 3),
          });

          return batch.map((entity) => ({
            success: importResult.success,
            entityName: entity.metadata.name,
          }));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to send batch to Kafka', {
            batchSize: batch.length,
            companyId,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error;
        }
      },
      (batchIndex, batchLength) => {
        this.logger.info('Completed batch import', {
          batchIndex,
          batchLength,
          totalBatches,
          progress: `${((batchIndex / totalBatches) * 100).toFixed(1)}%`,
        });
      }
    );

    const imported = results.length;
    const allErrors = errors;

    this.logger.info('Completed batch import of entities', {
      totalEntities: entities.length,
      imported,
      errors: allErrors.length,
      totalBatches,
    });

    return { imported, errors: allErrors };
  }

  private getErrorMessage(error: unknown, defaultMessage = 'Unknown error'): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return defaultMessage;
  }
}

