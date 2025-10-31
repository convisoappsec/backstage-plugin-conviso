import {
  ApiRef,
  ConfigApi,
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';

const DEFAULT_PROXY_PATH_BASE = '/conviso';

export interface BackstageIntegration {
  id: string;
  backstageUrl: string;
  instanceId: string;
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
  proxyPathBase?: string;
  configApi: ConfigApi;
  fetchApi: FetchApi;
};

export const convisoPlatformApiRef: ApiRef<ConvisoPlatformApi> = createApiRef<ConvisoPlatformApi>({
  id: 'plugin.conviso-platform.service',
});

export interface ConvisoPlatformApi {
  createOrUpdateBackstageIntegration(
    input: CreateOrUpdateBackstageIntegrationInput
  ): Promise<CreateOrUpdateBackstageIntegrationResult>;
}

export class ConvisoPlatformApiClient implements ConvisoPlatformApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly proxyPathBase: string;
  private readonly fetchApi: FetchApi;
  // Reserved for future use (e.g., feature flags, configuration)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly configApi: ConfigApi;

  private headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  constructor(options: Options) {
    this.discoveryApi = options.discoveryApi;
    this.configApi = options.configApi;
    this.proxyPathBase = options.proxyPathBase ?? DEFAULT_PROXY_PATH_BASE;
    this.fetchApi = options.fetchApi;
  }

  private async getGraphQLUrl(): Promise<string> {
    const baseUrl = await this.discoveryApi.getBaseUrl('proxy');
    return `${baseUrl}${this.proxyPathBase}/graphql`;
  }

  private async fetchGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const url = await this.getGraphQLUrl();
    const requestInit: RequestInit = {
      headers: this.headers,
      method: 'POST',
      body: JSON.stringify({
        query,
        variables,
      }),
    };

    const response = await this.fetchApi.fetch(url, requestInit);

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    const json = await response.json();

    if (json.errors) {
      const message = json.errors[0]?.message || 'GraphQL error';
      throw new Error(message);
    }

    return json.data as T;
  }

  async createOrUpdateBackstageIntegration(
    input: CreateOrUpdateBackstageIntegrationInput
  ): Promise<CreateOrUpdateBackstageIntegrationResult> {
    const mutation = `
      mutation CreateOrUpdateBackstageIntegration($input: CreateOrUpdateBackstageIntegrationInput!) {
        createOrUpdateBackstageIntegration(input: $input) {
          backstageIntegration {
            id
            backstageUrl
            instanceId
            updatedAt
          }
        }
      }
    `;

    return this.fetchGraphQL<CreateOrUpdateBackstageIntegrationResult>(
      mutation,
      { input }
    );
  }
}

