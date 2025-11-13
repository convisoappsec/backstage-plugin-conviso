import {
  ApiRef,
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

export interface BackstageIntegration {
  id: string;
  backstageUrl: string;
  instanceId: string;
  autoImportEnabled?: boolean;
  updatedAt: string;
}

export interface CreateOrUpdateBackstageIntegrationInput {
  companyId: number;
  backstageUrl: string;
  instanceId: string;
}

export interface CreateOrUpdateBackstageIntegrationResult {
  backstageIntegration: BackstageIntegration;
}

type Options = {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
};

export const convisoPlatformApiRef: ApiRef<ConvisoPlatformApi> = createApiRef<ConvisoPlatformApi>({
  id: 'plugin.conviso-platform.service',
});

export interface BackstageProject {
  id: string;
  name: string;
  description?: string;
  url?: string;
  repoUrl?: string;
  lifecycle?: string;
  tags?: string[];
  owner?: string;
  assetType?: string;
}

export interface ImportBackstageProjectsInput {
  companyId: number;
  projects: BackstageProject[];
}

export interface ImportBackstageProjectsResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
}

export interface CreateOrUpdateBackstageIntegrationInput {
  companyId: number;
  backstageUrl: string;
  instanceId: string;
}

export interface AutoImportSetting {
  enabled: boolean;
}

export interface ImportedAsset {
  id: string;
  name: string;
}

export interface ImportedAssetsResult {
  assets: ImportedAsset[];
}

export interface GetIntegrationResult {
  integration: BackstageIntegration;
  companyId?: number;
}

export interface CheckImportedNamesResult {
  importedNames: string[];
}

export interface ImportedAssetsCacheResult {
  assets: string[];
  lastSync: string;
  totalCount: number;
}

export interface SyncImportedAssetsResult {
  success: boolean;
  synced: number;
  duration: string;
}

export interface ConvisoConfigResult {
  environment: string;
  platformUrl: string;
  companyId?: number;
}

export interface ConvisoPlatformApi {
  createOrUpdateBackstageIntegration(
    input: CreateOrUpdateBackstageIntegrationInput
  ): Promise<CreateOrUpdateBackstageIntegrationResult>;
  getIntegration(instanceId: string): Promise<GetIntegrationResult | null>;
  importBackstageProjectsToAssets(
    input: ImportBackstageProjectsInput
  ): Promise<ImportBackstageProjectsResult>;
  setAutoImport(instanceId: string, enabled: boolean, companyId?: number): Promise<{ success: boolean; enabled: boolean }>;
  getAutoImport(instanceId: string): Promise<AutoImportSetting>;
  getImportedAssets(companyId: number): Promise<ImportedAssetsResult>;
  getImportedAssetsCache(companyId: number): Promise<ImportedAssetsCacheResult>;
  syncImportedAssets(companyId: number, force?: boolean): Promise<SyncImportedAssetsResult>;
  checkImportedAssetNames(companyId: number, names: string[]): Promise<CheckImportedNamesResult>;
  addImportedNames(companyId: number, names: string[]): Promise<{ success: boolean; added: number }>;
  getConfig(): Promise<ConvisoConfigResult>;
}

export class ConvisoPlatformApiClient implements ConvisoPlatformApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: Options) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async createOrUpdateBackstageIntegration(
    input: CreateOrUpdateBackstageIntegrationInput
  ): Promise<CreateOrUpdateBackstageIntegrationResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/integration`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(input.companyId ? { companyId: input.companyId } : {}),
        backstageUrl: input.backstageUrl,
        instanceId: input.instanceId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create integration';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const json = await response.json();
    return json;
  }

  async getIntegration(instanceId: string): Promise<GetIntegrationResult | null> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/integration/${instanceId}`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get integration');
    }

    const json = await response.json();
    return json;
  }

  async importBackstageProjectsToAssets(
    input: ImportBackstageProjectsInput
  ): Promise<ImportBackstageProjectsResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/import-projects`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: input.companyId,
        projects: input.projects,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to import projects';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const json = await response.json();
    return json;
  }

  async setAutoImport(instanceId: string, enabled: boolean, companyId?: number): Promise<{ success: boolean; enabled: boolean }> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/auto-import`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instanceId, enabled, companyId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update auto-import setting');
    }

    return await response.json();
  }

  async getAutoImport(instanceId: string): Promise<AutoImportSetting> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/auto-import/${instanceId}`;
    
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get auto-import setting');
    }

    return await response.json();
  }

  async getImportedAssets(companyId: number): Promise<ImportedAssetsResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/imported-assets/${companyId}`;
    
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get imported assets');
    }

    const json = await response.json();
    return json;
  }

  async getImportedAssetsCache(companyId: number): Promise<ImportedAssetsCacheResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/imported-assets-cache/${companyId}`;
    
    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get imported assets cache');
    }

    return await response.json();
  }

  async syncImportedAssets(companyId: number, force = false): Promise<SyncImportedAssetsResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/sync-imported-assets/${companyId}`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to sync imported assets');
    }

    return await response.json();
  }

  async checkImportedAssetNames(companyId: number, names: string[]): Promise<CheckImportedNamesResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/check-imported-names`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        names,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to check imported asset names');
    }

    return await response.json();
  }

  async addImportedNames(companyId: number, names: string[]): Promise<{ success: boolean; added: number }> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    const url = `${backendBaseUrl}/api/conviso/add-imported-names`;
    
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        names,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to add imported names to cache');
    }

    return await response.json();
  }

  async getConfig(): Promise<ConvisoConfigResult> {
    const baseUrl = await this.discoveryApi.getBaseUrl('backend');
    const backendBaseUrl = baseUrl.replace('/api/backend', '');
    // Add cache-busting parameter to force fresh request
    const url = `${backendBaseUrl}/api/conviso/config?t=${Date.now()}`;
    
    const response = await this.fetchApi.fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get config');
    }

    return await response.json();
  }
}

