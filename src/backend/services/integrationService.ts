import { inMemoryStore } from '../store/inMemoryStore';
import { ConvisoApiService } from './convisoApiService';

export interface BackstageIntegration {
  id: string;
  backstageUrl: string;
  instanceId: string;
  autoImportEnabled?: boolean;
  updatedAt: string;
}

export class IntegrationService {
  constructor(private apiService: ConvisoApiService) {}

  async getIntegration(instanceId: string): Promise<BackstageIntegration | null> {
    const query = `
      query GetBackstageIntegration($instanceId: String!) {
        backstageIntegration(instanceId: $instanceId) {
          id
          backstageUrl
          instanceId
          autoImportEnabled
          updatedAt
        }
      }
    `;

    try {
      const data = await this.apiService.request<{
        backstageIntegration: BackstageIntegration | null;
      }>({
        query,
        variables: { instanceId },
      });

      const integration = data.backstageIntegration;
      
      if (!integration) {
        return null;
      }

      if (integration.autoImportEnabled !== undefined) {
        inMemoryStore.setAutoImportSetting(instanceId, integration.autoImportEnabled);
      }

      return integration;
    } catch {
      return null;
    }
  }

  async createOrUpdateIntegration(input: {
    companyId: number;
    backstageUrl: string;
    instanceId: string;
  }): Promise<{ backstageIntegration: BackstageIntegration }> {
    const mutation = `
      mutation CreateOrUpdateBackstageIntegration($input: CreateOrUpdateBackstageIntegrationInput!) {
        createOrUpdateBackstageIntegration(input: $input) {
          backstageIntegration {
            id
            backstageUrl
            instanceId
            autoImportEnabled
            updatedAt
          }
        }
      }
    `;

    const data = await this.apiService.request<{
      createOrUpdateBackstageIntegration: { backstageIntegration: BackstageIntegration };
    }>({
      query: mutation,
      variables: {
        input: {
          companyId: input.companyId,
          backstageUrl: input.backstageUrl,
          instanceId: input.instanceId,
        },
      },
    });

    inMemoryStore.setCompanyId(input.instanceId, input.companyId);

    return data.createOrUpdateBackstageIntegration;
  }

  async updateAutoImportSetting(input: {
    companyId: number;
    backstageUrl: string;
    instanceId: string;
    autoImportEnabled: boolean;
  }): Promise<void> {
    const mutation = `
      mutation CreateOrUpdateBackstageIntegration($input: CreateOrUpdateBackstageIntegrationInput!) {
        createOrUpdateBackstageIntegration(input: $input) {
          backstageIntegration {
            id
            autoImportEnabled
          }
        }
      }
    `;

    await this.apiService.request({
      query: mutation,
      variables: {
        input: {
          companyId: input.companyId.toString(),
          backstageUrl: input.backstageUrl,
          instanceId: input.instanceId,
          autoImportEnabled: input.autoImportEnabled,
        },
      },
    });
  }
}

