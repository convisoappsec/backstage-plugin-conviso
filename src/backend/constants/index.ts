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
} as const;

export const POLLING_INTERVALS = {
  PRODUCTION_MS: 60 * 60 * 1000,
  DEVELOPMENT_MS: 30 * 1000,
  INITIAL_DELAY_MS: 5000,
} as const;

