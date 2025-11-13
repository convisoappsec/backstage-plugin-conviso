import { ASSET_TYPES, BATCH_PROCESSING, INTEGRATION_TYPES } from '../constants';
import { normalizeEntityName } from '../utils/nameNormalizer';
import { ConvisoApiService } from './convisoApiService';

export interface ImportedAsset {
  id: string;
  name: string;
}

export class AssetService {
  constructor(private apiService: ConvisoApiService) {}

  async getImportedAssets(companyId: number): Promise<ImportedAsset[]> {
    const query = `
      query GetAssets($companyId: ID!, $page: Int, $limit: Int, $search: AssetsSearch) {
        assets(companyId: $companyId, page: $page, limit: $limit, search: $search) {
          collection {
            id
            name
          }
          metadata {
            totalCount
            totalPages
            currentPage
            limitValue
          }
        }
      }
    `;

    const allAssets: ImportedAsset[] = [];
    let page = 1;
    let totalPages = 1;
    const limit = 2000;
    const CONCURRENT_REQUESTS = 10;
    let maxIterations = 1000;

    const integrationTypeFilter = INTEGRATION_TYPES.BACKSTAGE.toUpperCase();

    while (page <= totalPages && maxIterations > 0) {
      maxIterations--;
      
      try {
        const pagePromises: Promise<{
          assets: {
            collection: ImportedAsset[];
            metadata: {
              totalPages: number;
              totalCount: number;
            };
          };
        }>[] = [];

        const requestsToMake = Math.min(CONCURRENT_REQUESTS, totalPages - page + 1);

        for (let i = 0; i < requestsToMake; i++) {
          const variables = {
            companyId: companyId.toString(),
            page: page + i,
            limit,
            search: {
              integrationTypes: [integrationTypeFilter],
            },
          };
          
          pagePromises.push(
            this.apiService.request<{
              assets: {
                collection: ImportedAsset[];
                metadata: {
                  totalPages: number;
                  totalCount: number;
                };
              };
            }>({
              query,
              variables,
            })
          );
        }

        const results = await Promise.all(pagePromises);

        let hasValidData = false;
        for (let i = 0; i < results.length; i++) {
          const data = results[i];
          if (data && data.assets?.collection) {
            allAssets.push(...data.assets.collection);
            if (i === 0 && data.assets.metadata?.totalPages) {
              const newTotalPages = data.assets.metadata.totalPages;
              if (newTotalPages > 0 && newTotalPages !== totalPages) {
                totalPages = newTotalPages;
              }
            }
            hasValidData = true;
          }
        }

        if (!hasValidData) {
          break;
        }

        page += requestsToMake;
        
        if (page > totalPages) {
          break;
        }
      } catch (error: unknown) {
        throw error;
      }
    }

    if (maxIterations === 0) {
      throw new Error('Maximum iterations reached. Possible infinite loop in pagination.');
    }

    return allAssets;
  }

  async getImportedAssetNames(companyId: number): Promise<Set<string>> {
    try {
      const assets = await this.getImportedAssets(companyId);
      const importedNames = new Set<string>();

      assets.forEach((asset) => {
        const normalized = normalizeEntityName(asset.name);
        importedNames.add(normalized);
      });

      return importedNames;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[AssetService] Failed to get imported assets:', errorMsg, error);
      return new Set<string>();
    }
  }

  async checkImportedAssetNames(companyId: number, names: string[]): Promise<Set<string>> {
    if (names.length === 0) {
      return new Set<string>();
    }

    const query = `
      query GetAssets($companyId: ID!, $page: Int, $limit: Int, $search: AssetsSearch) {
        assets(companyId: $companyId, page: $page, limit: $limit, search: $search) {
          collection {
            id
            name
          }
          metadata {
            totalCount
            totalPages
            currentPage
            limitValue
          }
        }
      }
    `;

    const normalizedNames = new Set(names.map(name => normalizeEntityName(name)));
    const foundNames = new Set<string>();
    let page = 1;
    let hasMore = true;
    const limit = 500;

    while (hasMore && foundNames.size < normalizedNames.size) {
      try {
        const data = await this.apiService.request<{
          assets: {
            collection: ImportedAsset[];
            metadata: {
              totalPages: number;
              totalCount: number;
            };
          };
        }>({
          query,
          variables: {
            companyId: companyId.toString(),
            page,
            limit,
            search: {
              integrationTypes: [INTEGRATION_TYPES.BACKSTAGE.toUpperCase()],
            },
          },
        });

        if (data.assets?.collection) {
          data.assets.collection.forEach((asset) => {
            const normalized = normalizeEntityName(asset.name);
            if (normalizedNames.has(normalized)) {
              foundNames.add(normalized);
            }
          });

          const totalPages = data.assets.metadata?.totalPages || 1;
          hasMore = page < totalPages && foundNames.size < normalizedNames.size;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[AssetService] Error fetching page during pagination, stopping', {
          page,
          error: errorMsg,
        });
        break;
      }
    }

    return foundNames;
  }

  async importProjects(input: {
    companyId: number;
    projects: Array<{
      id: string;
      name: string;
      description?: string;
      url?: string;
      repoUrl?: string;
      lifecycle?: string;
      tags?: string[];
      owner?: string;
      assetType?: string;
    }>;
  }): Promise<{
    success: boolean;
    importedCount: number;
    errors?: string[];
  }> {
    const mutation = `
      mutation ImportAssetToIntegration($input: ImportAssetToIntegrationInput!) {
        importAssetToIntegration(input: $input) {
          success
          importedCount
          errors
        }
      }
    `;

    const graphqlBatchSize = BATCH_PROCESSING.GRAPHQL_BATCH_SIZE;
    const allErrors: string[] = [];
    let totalImported = 0;
    const totalBatches = Math.ceil(input.projects.length / graphqlBatchSize);

    try {
      for (let i = 0; i < input.projects.length; i += graphqlBatchSize) {
        const batch = input.projects.slice(i, i + graphqlBatchSize);
        const batchNumber = Math.floor(i / graphqlBatchSize) + 1;
        
        try {
          const projectData = batch.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description || '',
            url: project.url || '',
            repoUrl: project.repoUrl || '',
            lifecycle: project.lifecycle || '',
            tags: project.tags || [],
            owner: project.owner || '',
            assetType: project.assetType || ASSET_TYPES.API,
          }));

          const result = await this.apiService.request<{
            importAssetToIntegration: {
              success: boolean;
              importedCount: number;
              errors?: string[];
            };
          }>({
            query: mutation,
            variables: {
              input: {
                companyId: input.companyId.toString(),
                integrationType: INTEGRATION_TYPES.BACKSTAGE,
                projects: projectData,
              },
            },
          });

          if (result.importAssetToIntegration) {
            totalImported += result.importAssetToIntegration.importedCount || 0;
            if (result.importAssetToIntegration.errors) {
              allErrors.push(...result.importAssetToIntegration.errors);
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const batchInfo = `batch ${batchNumber}/${totalBatches} (${batch.length} projects)`;
          
          allErrors.push(`Failed to import ${batchInfo}: ${errorMessage}`);
          
          for (const project of batch) {
            allErrors.push(`  - ${project.name} (${project.id}): ${errorMessage}`);
          }
        }
      }

      const response: {
        success: boolean;
        importedCount: number;
        errors?: string[];
      } = {
        success: allErrors.length === 0,
        importedCount: totalImported,
      };

      if (allErrors.length > 0) {
        response.errors = allErrors;
      }

      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to import projects: ${errorMessage}`);
    }
  }
}

