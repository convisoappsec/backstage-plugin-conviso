import { Entity } from '@backstage/catalog-model';

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  url: string;
  repoUrl: string;
  lifecycle: string;
  tags: string[];
  owner: string;
  assetType: string;
}

export function extractProjectDataFromEntity(entity: Entity): ProjectData {
  const spec = entity.spec || {};
  return {
    id: `${entity.kind}:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
    name: entity.metadata.name,
    description: entity.metadata.description || '',
    url: entity.metadata.annotations?.['backstage.io/view-url'] || '',
    repoUrl: entity.metadata.annotations?.['backstage.io/source-location'] || '',
    lifecycle: String((spec as Record<string, unknown>).lifecycle || ''),
    tags: entity.metadata.tags || [],
    owner: String((spec as Record<string, unknown>).owner || ''),
    assetType: String((spec as Record<string, unknown>).type || 'service'),
  };
}

