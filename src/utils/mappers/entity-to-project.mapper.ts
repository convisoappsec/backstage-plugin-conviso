import { BackstageProject } from '../../api/convisoPlatformApi';
import { BackstageEntity } from '../../types/entity.types';

const LIFECYCLE_MAP: Record<string, string> = {
  'production': 'production',
  'prod': 'production',
  'development': 'homologation',
  'dev': 'homologation',
  'staging': 'homologation',
  'experimental': 'certification',
  'experiment': 'certification',
  'deprecated': 'discontinued',
  'sunset': 'discontinued',
  'archived': 'discontinued',
};

const ASSET_TYPE_MAP: Record<string, string> = {
  'service': 'api',
  'api': 'api',
  'rest-api': 'api',
  'graphql': 'api',
  'website': 'web',
  'web': 'web',
  'webapp': 'web',
  'web-app': 'web',
  'progressive-web-app': 'progressive_web_app',
  'pwa': 'progressive_web_app',
  'mobile': 'native_mobile',
  'native-mobile': 'native_mobile',
  'ios': 'native_mobile',
  'android': 'native_mobile',
  'hybrid-mobile': 'hybrid_mobile',
  'react-native': 'hybrid_mobile',
  'ionic': 'hybrid_mobile',
  'cordova': 'hybrid_mobile',
  'database': 'database',
  'db': 'database',
  'datastore': 'database',
  'library': 'client_server',
  'sdk': 'client_server',
  'client': 'client_server',
  'dmz': 'dmz',
  'demilitarized-zone': 'dmz',
  'legacy': 'legacy',
  'legacy-system': 'legacy',
  'cluster': 'cluster',
  'kubernetes': 'cluster',
  'k8s': 'cluster',
  'node': 'node',
  'microservice': 'node',
};

export function getEntityId(entity: BackstageEntity): string {
  const namespace = entity.metadata.namespace || 'default';
  return `${entity.kind}:${namespace}/${entity.metadata.name}`;
}

function extractRepoUrl(entity: BackstageEntity): string | undefined {
  const annotations = entity.metadata.annotations || {};
  
  const sourceLocation = annotations['backstage.io/source-location'];
  const githubUrl = annotations['github.com/project-slug'];
  
  let repoUrl = githubUrl ? `https://github.com/${githubUrl}` : undefined;
  
  if (sourceLocation?.startsWith('url:')) {
    repoUrl = sourceLocation.replace(/^url:/, '');
  } else if (sourceLocation) {
    repoUrl = sourceLocation;
  }
  
  return repoUrl;
}

function extractUrl(entity: BackstageEntity): string | undefined {
  const annotations = entity.metadata.annotations || {};
  const links = entity.metadata.links || [];
  
  const linkPriorities = ['production', 'app', 'website', 'site', 'url', 'homepage', 'home'];
  
  for (const priority of linkPriorities) {
    const relevantLink = links.find(link => 
      link.title && link.title.toLowerCase().includes(priority.toLowerCase())
    );
    if (relevantLink?.url) {
      return relevantLink.url;
    }
  }
  
  const httpLink = links.find(link => 
    link && link.url && (link.url.startsWith('http://') || link.url.startsWith('https://'))
  );
  
  if (httpLink?.url) {
    return httpLink.url;
  }
  
  if (links.length > 0 && links[0]?.url) {
    return links[0].url;
  }
  
  const viewUrl = annotations['backstage.io/view-url'];
  return viewUrl;
}

function mapLifecycle(lifecycle?: string): string | undefined {
  if (!lifecycle) return undefined;
  return LIFECYCLE_MAP[lifecycle.toLowerCase()] || 'production';
}

function mapAssetType(type?: string): string | undefined {
  if (!type) return undefined;
  return ASSET_TYPE_MAP[type.toLowerCase()] || 'api';
}

export function mapEntityToProject(entity: BackstageEntity): BackstageProject {
  const entityId = getEntityId(entity);
  const project: BackstageProject = {
    id: entityId,
    name: entity.metadata.name,
  };

  if (entity.metadata.description) {
    project.description = entity.metadata.description;
  }

  const url = extractUrl(entity);
  if (url) {
    project.url = url;
  }

  const repoUrl = extractRepoUrl(entity);
  if (repoUrl) {
    project.repoUrl = repoUrl;
  }

  if (entity.metadata.tags) {
    project.tags = entity.metadata.tags;
  }

  const lifecycle = mapLifecycle(entity.spec?.lifecycle);
  if (lifecycle) {
    project.lifecycle = lifecycle;
  }

  const assetType = mapAssetType(entity.spec?.type);
  if (assetType) {
    project.assetType = assetType;
  }

  if (entity.spec?.owner) {
    project.owner = entity.spec.owner;
  }

  return project;
}

