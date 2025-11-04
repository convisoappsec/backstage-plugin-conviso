import { BackstageEntity } from '../../types/entity.types';
import { getEntityId, mapEntityToProject } from './entity-to-project.mapper';

describe('entity-to-project mapper', () => {
  const createMockEntity = (overrides?: Partial<BackstageEntity>): BackstageEntity => {
    const defaultMetadata: BackstageEntity['metadata'] = {
      name: 'test-entity',
      namespace: 'default',
      description: 'Test description',
      annotations: {
        'backstage.io/view-url': 'https://example.com/view',
        'backstage.io/source-location': 'url:https://github.com/example/repo',
      },
      tags: ['tag1', 'tag2'],
      links: [],
    };

    return {
      kind: 'Component',
      apiVersion: 'backstage.io/v1alpha1',
      metadata: {
        ...defaultMetadata,
        ...overrides?.metadata,
        name: overrides?.metadata?.name ?? defaultMetadata.name,
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
        owner: 'team-backend',
        ...overrides?.spec,
      },
    };
  };

  describe('getEntityId', () => {
    it('should generate entity ID with namespace', () => {
      const entity = createMockEntity();
      expect(getEntityId(entity)).toBe('Component:default/test-entity');
    });

    it('should use default namespace when not provided', () => {
      const entity = createMockEntity({
        metadata: {
          name: 'test-entity',
          namespace: undefined,
        },
      });
      expect(getEntityId(entity)).toBe('Component:default/test-entity');
    });

    it('should use custom namespace', () => {
      const entity = createMockEntity({
        metadata: {
          name: 'test-entity',
          namespace: 'custom',
        },
      });
      expect(getEntityId(entity)).toBe('Component:custom/test-entity');
    });
  });

  describe('mapEntityToProject', () => {
    it('should map all fields correctly', () => {
      const entity = createMockEntity();
      const project = mapEntityToProject(entity);

      expect(project).toEqual({
        id: 'Component:default/test-entity',
        name: 'test-entity',
        description: 'Test description',
        url: 'https://example.com/view',
        repoUrl: 'https://github.com/example/repo',
        tags: ['tag1', 'tag2'],
        lifecycle: 'production',
        assetType: 'api',
        owner: 'team-backend',
      });
    });

    it('should map lifecycle correctly', () => {
      const testCases = [
        { input: 'production', expected: 'production' },
        { input: 'prod', expected: 'production' },
        { input: 'development', expected: 'homologation' },
        { input: 'dev', expected: 'homologation' },
        { input: 'staging', expected: 'homologation' },
        { input: 'experimental', expected: 'certification' },
        { input: 'deprecated', expected: 'discontinued' },
        { input: 'unknown', expected: 'production' },
      ];

      testCases.forEach(({ input, expected }) => {
        const entity = createMockEntity({
          spec: {
            lifecycle: input,
          },
        });
        const project = mapEntityToProject(entity);
        expect(project.lifecycle).toBe(expected);
      });
    });

    it('should map asset type correctly', () => {
      const testCases = [
        { input: 'service', expected: 'api' },
        { input: 'api', expected: 'api' },
        { input: 'website', expected: 'web' },
        { input: 'mobile', expected: 'native_mobile' },
        { input: 'react-native', expected: 'hybrid_mobile' },
        { input: 'database', expected: 'database' },
        { input: 'library', expected: 'client_server' },
        { input: 'unknown', expected: 'api' },
      ];

      testCases.forEach(({ input, expected }) => {
        const entity = createMockEntity({
          spec: {
            type: input,
          },
        });
        const project = mapEntityToProject(entity);
        expect(project.assetType).toBe(expected);
      });
    });

    it('should extract repo URL from source-location annotation', () => {
      const entity = createMockEntity({
        metadata: {
          name: 'test-entity',
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/example/repo',
          },
        },
      });
      const project = mapEntityToProject(entity);
      expect(project.repoUrl).toBe('https://github.com/example/repo');
    });

    it('should extract URL from links with priority', () => {
      const entity = createMockEntity({
        metadata: {
          name: 'test-entity',
          links: [
            { title: 'Homepage', url: 'https://example.com/home' },
            { title: 'Production', url: 'https://example.com/prod' },
          ],
        },
      });
      const project = mapEntityToProject(entity);
      expect(project.url).toBe('https://example.com/prod');
    });

    it('should handle missing optional fields', () => {
      const entity = createMockEntity({
        metadata: {
          name: 'test-entity',
          description: undefined,
          annotations: {},
          tags: undefined,
          links: undefined,
        },
        spec: {
          lifecycle: undefined,
          owner: undefined,
          type: undefined,
        },
      });
      const project = mapEntityToProject(entity);

      expect(project).toEqual({
        id: 'Component:default/test-entity',
        name: 'test-entity',
      });
    });
  });
});

