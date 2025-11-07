import { AuthService, LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { ConvisoConfig } from '../config/convisoConfig';
import { ENTITY_KINDS } from '../constants';
import { inMemoryStore } from '../store/inMemoryStore';
import { extractProjectDataFromEntity } from '../utils/entityMapper';
import { normalizeEntityName } from '../utils/nameNormalizer';
import { AssetService } from './assetService';

export interface AutoImportResult {
  imported: number;
  errors: string[];
}

export class AutoImportService {
  constructor(
    private assetService: AssetService,
    private catalogApi: CatalogService,
    private auth: AuthService,
    private config: ConvisoConfig,
    private logger: LoggerService
  ) {}

  async importEntity(entity: Entity, companyId: number): Promise<void> {
    const projectData = extractProjectDataFromEntity(entity);
    
    await this.assetService.importProjects({
      companyId,
      projects: [projectData],
    });
  }

  async checkAndImportNewEntities(): Promise<AutoImportResult> {
    const results: AutoImportResult = { imported: 0, errors: [] };

    try {
      const enabledInstances = inMemoryStore.getEnabledInstances();

      if (enabledInstances.length === 0) {
        return results;
      }

      for (const { instanceId, companyId: companyIdFromStore } of enabledInstances) {
        const instanceResult = await this.processInstance(instanceId, companyIdFromStore);
        results.imported += instanceResult.imported;
        results.errors.push(...instanceResult.errors);
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
        const errorMsg = `No companyId found for instance ${instanceId}. Set CONVISO_COMPANY_ID in .env file.`;
        results.errors.push(errorMsg);
        return results;
      }

      const importedAssetNames = await this.assetService.getImportedAssetNames(companyId);
      const entities = await this.fetchCatalogEntities();
      const nonImportedEntities = this.filterNonImportedEntities(entities, importedAssetNames);

      if (nonImportedEntities.length === 0) {
        return results;
      }

      const importResult = await this.importEntities(nonImportedEntities, companyId);
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

  private async fetchCatalogEntities(): Promise<Entity[]> {
    const entities = await this.catalogApi.getEntities(
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
      },
      { credentials: await this.auth.getOwnServiceCredentials() }
    );

    return entities.items;
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
    const result: { imported: number; errors: string[] } = { imported: 0, errors: [] };

    for (const entity of entities) {
      try {
        await this.importEntity(entity, companyId);
        result.imported++;
      } catch (error: unknown) {
        const errorMsg = `Failed to auto-import ${entity.metadata.name}: ${this.getErrorMessage(error)}`;
        this.logger.error('Failed to auto-import entity', {
          entityName: entity.metadata.name,
          companyId,
          error: this.getErrorMessage(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        result.errors.push(errorMsg);
      }
    }

    return result;
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

