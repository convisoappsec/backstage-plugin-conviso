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
    const limit = 100;

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
            integrationTypes: ['BACKSTAGE'],
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
        const normalized = asset.name.toLowerCase().trim().replace(/\s+/g, ' ');
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
    const mutation = `
      mutation ImportBackstageProjectsToAssets($input: ImportBackstageProjectsToAssetsInput!) {
        importBackstageProjectsToAssets(input: $input) {
          success
          importedCount
          errors
        }
      }
    `;

    const mutationVariables = {
      input: {
        companyId: input.companyId.toString(),
        projects: input.projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          url: p.url || '',
          repoUrl: p.repoUrl || '',
          lifecycle: p.lifecycle || '',
          tags: p.tags || [],
          owner: p.owner || '',
          assetType: p.assetType || 'api',
        })),
      },
    };

    const data = await this.apiService.request<{
      importBackstageProjectsToAssets: {
        success: boolean;
        importedCount: number;
        errors?: string[];
      };
    }>({
      query: mutation,
      variables: mutationVariables,
    });

    return data.importBackstageProjectsToAssets;
  }
}

