import { AuthService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { inMemoryStore } from '../store/inMemoryStore';
import { extractProjectDataFromEntity } from '../utils/entityMapper';
import { AssetService } from './assetService';
import { ConvisoApiService } from './convisoApiService';

export interface AutoImportResult {
  imported: number;
  errors: string[];
}

export class AutoImportService {
  constructor(
    private assetService: AssetService,
    private apiService: ConvisoApiService,
    private catalogApi: CatalogService,
    private auth: AuthService
  ) {}

  async importEntity(entity: Entity, companyId: number): Promise<void> {
    const projectData = extractProjectDataFromEntity(entity);
    const projects = [projectData];

    const mutation = `
      mutation ImportBackstageProjectsToAssets($input: ImportBackstageProjectsToAssetsInput!) {
        importBackstageProjectsToAssets(input: $input) {
          success
          importedCount
          errors
        }
      }
    `;

    await this.apiService.request({
      query: mutation,
      variables: {
        input: {
          companyId: companyId.toString(),
          projects,
        },
      },
    });
  }

  async checkAndImportNewEntities(): Promise<AutoImportResult> {
    const results: AutoImportResult = { imported: 0, errors: [] };

    try {
      const enabledInstances = inMemoryStore.getEnabledInstances();

      if (enabledInstances.length === 0) {
        return results;
      }

      for (const { instanceId, companyId } of enabledInstances) {
        try {
          const importedAssetNames = await this.assetService.getImportedAssetNames(companyId);

          const entities = await this.catalogApi.getEntities(
            {
              filter: { kind: 'Component' },
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

          const nonImportedEntities = entities.items.filter((entity: any) => {
            const entityName = entity.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
            const isImported = importedAssetNames.has(entityName);
            return !isImported;
          });

          if (nonImportedEntities.length === 0) {
            continue;
          }

          for (const entity of nonImportedEntities) {
            try {
              await this.importEntity(entity, companyId);
              results.imported++;
            } catch (error: any) {
              const errorMsg = `Failed to auto-import ${entity.metadata.name}: ${error.message}`;
              results.errors.push(errorMsg);
            }
          }
        } catch (error: any) {
          const errorMsg = `Error checking catalog for instance ${instanceId}: ${error.message}`;
          results.errors.push(errorMsg);
        }
      }
    } catch (error: any) {
      const errorMsg = `Error in catalog check: ${error.message}`;
      results.errors.push(errorMsg);
    }

    return results;
  }
}

