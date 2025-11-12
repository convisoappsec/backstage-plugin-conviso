import type { BackendFeature } from '@backstage/backend-plugin-api';

declare module '@conviso/backstage-plugin-conviso/backend.js' {
  export const convisoBackendPlugin: BackendFeature;
  export default convisoBackendPlugin;
}

