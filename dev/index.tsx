import { createDevApp } from '@backstage/dev-utils';
import { backstagePluginConvisoPlugin, BackstagePluginConvisoPage } from '../src/plugin';

createDevApp()
  .registerPlugin(backstagePluginConvisoPlugin)
  .addPage({
    element: <BackstagePluginConvisoPage />,
    title: 'Root Page',
    path: '/backstage-plugin-conviso',
  })
  .render();
