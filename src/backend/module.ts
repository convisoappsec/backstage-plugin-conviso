import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';

const autoImportSettings = new Map<string, boolean>();
const instanceCompanyIds = new Map<string, number>();

export const convisoBackendPlugin = createBackendPlugin({
  pluginId: 'conviso',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        catalogApi: catalogServiceRef,
        auth: coreServices.auth,
      },
      async init({ httpRouter, catalogApi, auth }) {
        const router = express.Router();
        
        const environment = process.env['CONVISO_ENVIRONMENT'] || process.env['CONVISO_ENV'] || 'staging';
        
        let convisoApiBase = process.env['CONVISO_API_BASE'] 
          || process.env['CONVISO_API_BASE_STAGING'] 
          || 'https://api.staging.convisoappsec.com';
        
        if (environment === 'production') {
          convisoApiBase = process.env['CONVISO_API_BASE_PRODUCTION'] || 'https://api.convisoappsec.com';
        }
        
        const convisoApiKey = process.env['CONVISO_API_KEY'] || '';

        router.use(express.json());

        router.get('/integration/:instanceId', async (req, res) => {
          try {
            const { instanceId } = req.params;

            if (!instanceId) {
              return res.status(400).json({ error: 'instanceId is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            const query = `
              query GetBackstageIntegration($instanceId: String!) {
                backstageIntegration(instanceId: $instanceId) {
                  id
                  backstageUrl
                  instanceId
                  autoImportEnabled
                  updatedAt
                }
              }
            `;

            const response = await fetch(`${convisoApiBase}/graphql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': convisoApiKey,
                'skip_zrok_interstitial': '1',
              },
              body: JSON.stringify({
                query,
                variables: { instanceId },
              }),
            });

            if (!response.ok) {
              return res.status(404).json({ error: 'Integration not found' });
            }

            const json = await response.json();
            if (json.errors) {
              return res.status(404).json({ error: 'Integration not found' });
            }

            const integration = json.data?.backstageIntegration;
            if (!integration) {
              return res.status(404).json({ error: 'Integration not found' });
            }

            if (integration.autoImportEnabled !== undefined) {
              autoImportSettings.set(instanceId, integration.autoImportEnabled);
            }

            const companyId = instanceCompanyIds.get(instanceId);
            if (companyId) {
              res.json({ 
                integration,
                companyId 
              });
            } else {
              res.json({ integration });
            }
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        router.post('/integration', async (req, res) => {
          try {
            const { companyId, backstageUrl, instanceId } = req.body;

            if (!backstageUrl || !instanceId) {
              return res.status(400).json({ error: 'backstageUrl and instanceId are required' });
            }

            if (!companyId) {
              return res.status(400).json({ error: 'Company ID is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            const mutation = `
              mutation CreateOrUpdateBackstageIntegration($input: CreateOrUpdateBackstageIntegrationInput!) {
                createOrUpdateBackstageIntegration(input: $input) {
                  backstageIntegration {
                    id
                    backstageUrl
                    instanceId
                    autoImportEnabled
                    updatedAt
                  }
                }
              }
            `;

            const response = await fetch(`${convisoApiBase}/graphql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': convisoApiKey,
                'skip_zrok_interstitial': '1',
              },
              body: JSON.stringify({
                query: mutation,
                variables: {
                  input: {
                    companyId: parseInt(companyId.toString(), 10),
                    backstageUrl,
                    instanceId,
                  },
                },
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              return res.status(response.status).json({ error: errorText || 'Failed to create integration' });
            }

            const json = await response.json();
            if (json.errors) {
              return res.status(500).json({ error: json.errors[0]?.message || 'GraphQL error' });
            }

            instanceCompanyIds.set(instanceId, parseInt(companyId.toString(), 10));

            res.json(json.data.createOrUpdateBackstageIntegration);
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        router.post('/auto-import', async (req, res) => {
          try {
            const { instanceId, enabled, companyId: companyIdFromRequest } = req.body;

            if (instanceId === undefined || enabled === undefined) {
              return res.status(400).json({ error: 'instanceId and enabled are required' });
            }

            autoImportSettings.set(instanceId, enabled);
            
            let companyId: number | undefined = companyIdFromRequest ? parseInt(companyIdFromRequest.toString(), 10) : instanceCompanyIds.get(instanceId);
            
            if (companyIdFromRequest && companyId !== undefined) {
              instanceCompanyIds.set(instanceId, companyId);
            }
            
            if (companyId) {
              try {
                const integrationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/conviso/integration/${instanceId}`);
                let backstageUrl = '';
                if (integrationResponse.ok) {
                  const integrationData = await integrationResponse.json();
                  backstageUrl = integrationData.integration?.backstageUrl || '';
                }
                
                if (backstageUrl) {
                  const updateMutation = `
                    mutation CreateOrUpdateBackstageIntegration($input: CreateOrUpdateBackstageIntegrationInput!) {
                      createOrUpdateBackstageIntegration(input: $input) {
                        backstageIntegration {
                          id
                          autoImportEnabled
                        }
                      }
                    }
                  `;
                  
                  const updateResponse = await fetch(`${convisoApiBase}/graphql`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-API-Key': convisoApiKey,
                      'skip_zrok_interstitial': '1',
                    },
                    body: JSON.stringify({
                      query: updateMutation,
                      variables: {
                        input: {
                          companyId: companyId.toString(),
                          backstageUrl,
                          instanceId,
                          autoImportEnabled: enabled,
                        },
                      },
                    }),
                  });
                  
                  if (updateResponse.ok) {
                    const updateJson = await updateResponse.json();
                    if (updateJson.errors) {
                      // Error updating auto-import in integration
                    }
                  }
                }
              } catch (error: any) {
                // Continue anyway - the setting is saved in memory
              }
            }
            
            if (enabled) {
              let companyId = instanceCompanyIds.get(instanceId);
              
              if (!companyId) {
                try {
                  const integrationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/conviso/integration/${instanceId}`);
                  if (integrationResponse.ok) {
                    const integrationData = await integrationResponse.json();
                    if (integrationData.companyId) {
                      companyId = parseInt(integrationData.companyId.toString(), 10);
                      instanceCompanyIds.set(instanceId, companyId);
                    }
                  }
                } catch (fetchError: any) {
                  // Could not fetch companyId from integration endpoint
                }
              }
              
              if (companyId) {
                setTimeout(() => {
                  checkAndImportNewEntities().catch((error: any) => {
                    // Error in immediate auto-import check
                  });
                }, 1000);
              }
            }
            
            res.json({ success: true, enabled });
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        router.get('/auto-import/:instanceId', async (req, res) => {
          try {
            const { instanceId } = req.params;
            const enabled = autoImportSettings.get(instanceId) || false;
            
            res.json({ enabled });
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        router.get('/imported-assets/:companyId', async (req, res) => {
          try {
            const { companyId } = req.params;

            if (!companyId) {
              return res.status(400).json({ error: 'Company ID is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            const query = `
              query GetAssets($companyId: ID!, $page: Int, $limit: Int, $search: AssetsSearch) {
                assets(companyId: $companyId, page: $page, limit: $limit, search: $search) {
                  collection {
                    id
                    name
                    integrations
                  }
                  metadata {
                    totalCount
                    totalPages
                    currentPage
                    limitValue
                  }
                }
              }
            `;

            let allAssets: any[] = [];
            let page = 1;
            let hasMore = true;
            const limit = 100;

            while (hasMore) {
              const response = await fetch(`${convisoApiBase}/graphql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': convisoApiKey,
                  'skip_zrok_interstitial': '1',
                },
                body: JSON.stringify({
                  query,
                  variables: {
                    companyId: companyId.toString(),
                    page,
                    limit,
                    search: {
                      integrationTypes: ['BACKSTAGE']
                    }
                  },
                }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                break;
              }

              const json = await response.json();
              if (json.errors) {
                break;
              }

              if (json.data?.assets?.collection) {
                const pageAssets = json.data.assets.collection;
                allAssets = allAssets.concat(pageAssets);
                const totalPages = json.data.assets.metadata?.totalPages || 1;
                hasMore = page < totalPages;
                page++;
              } else {
                hasMore = false;
              }
            }

            res.json({
              assets: allAssets.map((asset: any) => ({
                id: asset.id,
                name: asset.name,
              })),
            });
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        function extractProjectDataFromEntity(entity: Entity): any {
          const spec = entity.spec || {};
          return {
            id: `${entity.kind}:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
            name: entity.metadata.name,
            description: entity.metadata.description || '',
            url: entity.metadata.annotations?.['backstage.io/view-url'] || '',
            repoUrl: entity.metadata.annotations?.['backstage.io/source-location'] || '',
            lifecycle: spec['lifecycle'] || '',
            tags: entity.metadata.tags || [],
            owner: spec['owner'] || '',
            assetType: spec['type'] || 'service',
          };
        }

        async function importEntityToConviso(
          entity: Entity,
          companyId: number,
          _instanceId: string
        ): Promise<void> {
          const projectData = extractProjectDataFromEntity(entity);
          const projects = [projectData];

          const mutation = `
            mutation ImportBackstageProjectsToAssets($input: ImportBackstageProjectsToAssetsInput!) {
              importBackstageProjectsToAssets(input: $input) {
                success
                importedCount
                errors
              }
            }
          `;

          const response = await fetch(`${convisoApiBase}/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': convisoApiKey,
              'skip_zrok_interstitial': '1',
            },
            body: JSON.stringify({
              query: mutation,
              variables: {
                input: {
                  companyId: companyId.toString(),
                  projects,
                },
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to import: ${errorText}`);
          }

          const json = await response.json();
          if (json.errors) {
            throw new Error(json.errors[0]?.message || 'GraphQL error');
          }
        }

        async function getImportedAssetNames(companyId: number): Promise<Set<string>> {
          try {
            const query = `
              query GetAssets($companyId: ID!, $page: Int, $limit: Int, $search: AssetsSearch) {
                assets(companyId: $companyId, page: $page, limit: $limit, search: $search) {
                  collection {
                    name
                  }
                  metadata {
                    totalPages
                  }
                }
              }
            `;

            const importedNames = new Set<string>();
            let page = 1;
            let hasMore = true;
            const limit = 100;

            while (hasMore) {
              const response = await fetch(`${convisoApiBase}/graphql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': convisoApiKey,
                  'skip_zrok_interstitial': '1',
                },
                body: JSON.stringify({
                  query,
                  variables: {
                    companyId: companyId.toString(),
                    page,
                    limit,
                    search: {
                      integrationTypes: ['BACKSTAGE']
                    }
                  },
                }),
              });

              if (!response.ok) {
                break;
              }

              const json = await response.json();
              if (json.errors) {
                break;
              }

              if (json.data?.assets?.collection) {
                const pageAssets = json.data.assets.collection;
                pageAssets.forEach((asset: any) => {
                  const normalized = asset.name.toLowerCase().trim().replace(/\s+/g, ' ');
                  importedNames.add(normalized);
                });
                
                const totalPages = json.data.assets.metadata?.totalPages || 1;
                hasMore = page < totalPages;
                page++;
              } else {
                hasMore = false;
              }
            }

            return importedNames;
          } catch (error: any) {
            return new Set<string>();
          }
        }

        async function checkAndImportNewEntities(): Promise<{ imported: number; errors: string[] }> {
          const results = { imported: 0, errors: [] as string[] };

          try {
            const enabledInstances = Array.from(autoImportSettings.entries())
              .filter(([_, enabled]) => enabled)
              .map(([instanceId]) => ({
                instanceId,
                companyId: instanceCompanyIds.get(instanceId)
              }))
              .filter(inst => inst.companyId !== undefined);

            if (enabledInstances.length === 0) {
              return results;
            }

            for (const { instanceId, companyId } of enabledInstances) {
              try {
                const importedAssetNames = await getImportedAssetNames(companyId!);

                const entities = await catalogApi.getEntities(
                  { 
                    filter: { kind: 'Component' },
                    fields: [
                      'metadata.name',
                      'metadata.namespace',
                      'metadata.description',
                      'metadata.annotations',
                      'metadata.tags',
                      'metadata.links',
                      'spec.type',
                      'spec.lifecycle',
                      'spec.owner',
                      'kind',
                      'apiVersion',
                    ],
                  },
                  { credentials: await auth.getOwnServiceCredentials() }
                );

                const nonImportedEntities = entities.items.filter((entity: any) => {
                  const entityName = entity.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
                  const isImported = importedAssetNames.has(entityName);
                  return !isImported;
                });

                if (nonImportedEntities.length === 0) {
                  continue;
                }

                for (const entity of nonImportedEntities) {
                  try {
                    await importEntityToConviso(entity, companyId!, instanceId);
                    results.imported++;
                  } catch (error: any) {
                    const errorMsg = `Failed to auto-import ${entity.metadata.name}: ${error.message}`;
                    results.errors.push(errorMsg);
                  }
                }
              } catch (error: any) {
                const errorMsg = `Error checking catalog for instance ${instanceId}: ${error.message}`;
                results.errors.push(errorMsg);
              }
            }
          } catch (error: any) {
            const errorMsg = `Error in catalog check: ${error.message}`;
            results.errors.push(errorMsg);
          }

          return results;
        }

        try {
          const pollingInterval = environment === 'production' 
            ? 60 * 60 * 1000
            : 30 * 1000;

          const runPollingCycle = async () => {
            await checkAndImportNewEntities();
          };

          const loadPersistedSettings = async () => {
            try {
              // Settings loaded when integrations are accessed via GET /integration
            } catch (error: any) {
              // Could not load persisted settings on startup
            }
          };
          
          loadPersistedSettings();
          
          setTimeout(() => {
            runPollingCycle();
          }, 5000);

          setInterval(() => {
            runPollingCycle();
          }, pollingInterval);
        } catch (error: any) {
          // Could not set up catalog subscription
        }

        router.post('/trigger-auto-import', async (_req, res) => {
          try {
            const results = await checkAndImportNewEntities();
            
            res.json({
              success: true,
              imported: results.imported,
              errors: results.errors,
              message: results.imported > 0 
                ? `✅ Successfully imported ${results.imported} new entity(ies) immediately!` 
                : `ℹ️ No new entities found to import. ${results.errors.length} error(s) occurred.`,
              timestamp: new Date().toISOString()
            });
          } catch (error: any) {
            res.status(500).json({ 
              success: false,
              error: error.message || 'Internal server error',
              timestamp: new Date().toISOString()
            });
          }
        });

        router.post('/test-auto-import', async (_req, res) => {
          try {
            const results = await checkAndImportNewEntities();
            
            res.json({
              success: true,
              imported: results.imported,
              errors: results.errors,
              message: `Imported ${results.imported} new entity(ies). ${results.errors.length} error(s) occurred.`
            });
          } catch (error: any) {
            res.status(500).json({ 
              success: false,
              error: error.message || 'Internal server error' 
            });
          }
        });

        router.post('/import-projects', async (req, res) => {
          try {
            const { companyId, projects } = req.body;

            if (!projects || !Array.isArray(projects)) {
              return res.status(400).json({ error: 'projects array is required' });
            }

            if (!companyId) {
              return res.status(400).json({ error: 'Company ID is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            const mutation = `
              mutation ImportBackstageProjectsToAssets($input: ImportBackstageProjectsToAssetsInput!) {
                importBackstageProjectsToAssets(input: $input) {
                  success
                  importedCount
                  errors
                }
              }
            `;

            const mutationVariables: any = {
              input: {
                companyId: companyId.toString(),
                projects: projects.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description || '',
                  url: p.url || '',
                  repoUrl: p.repoUrl || p.repo_url || '',
                  lifecycle: p.lifecycle || '',
                  tags: p.tags || [],
                  owner: p.owner || '',
                  assetType: p.assetType || p.asset_type || 'api',
                })),
              },
            };

            const response = await fetch(`${convisoApiBase}/graphql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': convisoApiKey,
                'skip_zrok_interstitial': '1',
              },
              body: JSON.stringify({
                query: mutation,
                variables: mutationVariables,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              return res.status(response.status).json({ error: errorText || 'Failed to import projects' });
            }

            const json = await response.json();
            
            if (json.errors) {
              return res.status(500).json({ error: json.errors[0]?.message || 'GraphQL error' });
            }

            if (!json.data || !json.data.importBackstageProjectsToAssets) {
              return res.status(500).json({ error: 'Invalid response from GraphQL API' });
            }

            res.json(json.data.importBackstageProjectsToAssets);
          } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        httpRouter.use(router);
      },
    });
  },
});

export default convisoBackendPlugin;

