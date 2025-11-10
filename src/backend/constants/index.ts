export const INTEGRATION_TYPES = {
  BACKSTAGE: 'backstage',
} as const;

export const ENTITY_KINDS = {
  COMPONENT: 'Component',
} as const;

export const ASSET_TYPES = {
  API: 'api',
  SERVICE: 'service',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 100,
  CATALOG_FETCH_LIMIT: 100,
  PROCESSING_BATCH_SIZE: 1000,
} as const;

export const BATCH_PROCESSING = {
  IMPORT_BATCH_SIZE: 110,
  GRAPHQL_BATCH_SIZE: 25,
  CONCURRENT_REQUESTS: 10,
  REQUEST_DELAY_MS: 200,
} as const;

export const POLLING_INTERVALS = {
  PRODUCTION_MS: 60 * 60 * 1000,
} as const;

