import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const backstagePluginConvisoPlugin = createPlugin({
  id: 'backstage-plugin-conviso',
  routes: {
    root: rootRouteRef,
  },
});

export const BackstagePluginConvisoPage = backstagePluginConvisoPlugin.provide(
  createRoutableExtension({
    name: 'BackstagePluginConvisoPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
