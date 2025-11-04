import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import {
  ConvisoPlatformApiClient,
  convisoPlatformApiRef,
} from './api/convisoPlatformApi';
import { rootRouteRef } from './routes';

export const backstagePluginConvisoPlugin = createPlugin({
  id: 'backstage-plugin-conviso',
  apis: [
    createApiFactory({
      api: convisoPlatformApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new ConvisoPlatformApiClient({
          discoveryApi,
          fetchApi,
        }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const BackstagePluginConvisoPage = backstagePluginConvisoPlugin.provide(
  createRoutableExtension({
    name: 'BackstagePluginConvisoPage',
    component: () =>
      import('./components/ConvisoPlatformConfig').then(m => m.ConvisoPlatformConfig),
    mountPoint: rootRouteRef,
  }),
);
