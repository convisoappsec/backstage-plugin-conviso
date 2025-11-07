import { ASSET_TYPES, INTEGRATION_TYPES, PAGINATION } from '../constants';
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
    let hasMore = true;
    const limit = PAGINATION.DEFAULT_LIMIT;

    while (hasMore) {
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
        allAssets.push(...data.assets.collection);
        const totalPages = data.assets.metadata?.totalPages || 1;
        hasMore = page < totalPages;
        page++;
      } else {
        hasMore = false;
      }
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
    } catch {
      return new Set<string>();
    }
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
    const results = await Promise.all(
      input.projects.map((project) => {
        const mutation = `
          mutation ImportAssetToIntegration($input: ImportAssetToIntegrationInput!) {
            importAssetToIntegration(input: $input) {
              success
              importedCount
              errors
            }
          }
        `;

        return this.apiService.request<{
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
              project: {
                id: project.id,
                name: project.name,
                description: project.description || '',
                url: project.url || '',
                repoUrl: project.repoUrl || '',
                lifecycle: project.lifecycle || '',
                tags: project.tags || [],
                owner: project.owner || '',
                assetType: project.assetType || ASSET_TYPES.API,
              },
            },
          },
        });
      })
    );

    const totalImported = results.reduce((sum, result) => sum + result.importAssetToIntegration.importedCount, 0);
    const allErrors = results
      .flatMap((result) => result.importAssetToIntegration.errors || [])
      .filter(Boolean);

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
  }
}

