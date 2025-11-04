import { ConvisoConfig } from '../config/convisoConfig';

interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class ConvisoApiService {
  constructor(private config: ConvisoConfig) {}

  async request<T = any>(request: GraphQLRequest): Promise<T> {
    if (!this.config.apiKey) {
      throw new Error('API Key not configured. Set CONVISO_API_KEY in .env file.');
    }

    const response = await fetch(`${this.config.apiBase}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'skip_zrok_interstitial': '1',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GraphQL request failed: ${errorText}`);
    }

    const json: GraphQLResponse<T> = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error');
    }

    if (!json.data) {
      throw new Error('No data in GraphQL response');
    }

    return json.data;
  }
}

