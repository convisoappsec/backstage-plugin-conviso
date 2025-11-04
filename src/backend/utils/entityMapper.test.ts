import { Entity } from '@backstage/catalog-model';
import { extractProjectDataFromEntity } from './entityMapper';

describe('extractProjectDataFromEntity', () => {
  const createMockEntity = (overrides?: Partial<Entity>): Entity => ({
    kind: 'Component',
    apiVersion: 'backstage.io/v1alpha1',
    metadata: {
      name: 'test-entity',
      namespace: 'default',
      description: 'Test description',
      annotations: {
        'backstage.io/view-url': 'https://example.com/view',
        'backstage.io/source-location': 'url:https://github.com/example/repo',
      },
      tags: ['tag1', 'tag2'],
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'team-backend',
    },
    ...overrides,
  });

  it('should extract all fields from entity', () => {
    const entity = createMockEntity();
    const result = extractProjectDataFromEntity(entity);

    expect(result).toEqual({
      id: 'Component:default/test-entity',
      name: 'test-entity',
      description: 'Test description',
      url: 'https://example.com/view',
      repoUrl: 'url:https://github.com/example/repo',
      lifecycle: 'production',
      tags: ['tag1', 'tag2'],
      owner: 'team-backend',
      assetType: 'service',
    });
  });

  it('should use default namespace when not provided', () => {
    const entity = createMockEntity({
      metadata: {
        name: 'test-entity',
        namespace: undefined,
      },
    });
    const result = extractProjectDataFromEntity(entity);

    expect(result.id).toBe('Component:default/test-entity');
  });

  it('should handle missing optional fields', () => {
    const entity = createMockEntity({
      metadata: {
        name: 'minimal-entity',
        description: undefined,
        annotations: {},
        tags: undefined,
      },
      spec: {
        type: undefined,
        lifecycle: undefined,
        owner: undefined,
      },
    });
    const result = extractProjectDataFromEntity(entity);

    expect(result).toEqual({
      id: 'Component:default/minimal-entity',
      name: 'minimal-entity',
      description: '',
      url: '',
      repoUrl: '',
      lifecycle: '',
      tags: [],
      owner: '',
      assetType: 'service',
    });
  });

  it('should use custom namespace', () => {
    const entity = createMockEntity({
      metadata: {
        name: 'test-entity',
        namespace: 'custom-namespace',
      },
    });
    const result = extractProjectDataFromEntity(entity);

    expect(result.id).toBe('Component:custom-namespace/test-entity');
  });

  it('should default assetType to service when type is not provided', () => {
    const entity = createMockEntity({
      spec: {
        type: undefined,
      },
    });
    const result = extractProjectDataFromEntity(entity);

    expect(result.assetType).toBe('service');
  });

  it('should handle empty spec', () => {
    const entity = createMockEntity({
      spec: {},
    });
    const result = extractProjectDataFromEntity(entity);

    expect(result.lifecycle).toBe('');
    expect(result.owner).toBe('');
    expect(result.assetType).toBe('service');
  });
});

