import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';

console.log('[Conviso Backend] Module file loaded');

// In-memory store for auto-import settings (keyed by instanceId)
const autoImportSettings = new Map<string, boolean>();
// Store companyId for each instanceId
const instanceCompanyIds = new Map<string, number>();
// Note: We no longer use in-memory tracking - we check Conviso Platform directly
// This ensures accuracy even after backend restarts

export const convisoBackendPlugin = createBackendPlugin({
  pluginId: 'conviso',
  register(env) {
    console.log('[Conviso Backend] Register called');
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        catalogApi: catalogServiceRef,
        auth: coreServices.auth,
      },
      async init({ httpRouter, catalogApi, auth }) {
        console.log('[Conviso Backend] Initializing backend module...');
        const router = express.Router();
        
        // Read environment variables from process.env (loaded by dotenv-cli)
        // Backstage's dotenv-cli loads .env into process.env when running yarn start
        const environment = process.env['CONVISO_ENVIRONMENT'] || process.env['CONVISO_ENV'] || 'staging';
        
        // Get API base URL from process.env
        let convisoApiBase = process.env['CONVISO_API_BASE'] 
          || process.env['CONVISO_API_BASE_STAGING'] 
          || 'https://api.staging.convisoappsec.com';
        
        if (environment === 'production') {
          convisoApiBase = process.env['CONVISO_API_BASE_PRODUCTION'] || 'https://api.convisoappsec.com';
        }
        
        // Get API key from process.env (loaded from .env file)
        const convisoApiKey = process.env['CONVISO_API_KEY'] || '';

        console.log('[Conviso Backend] Config loaded:', {
          environment,
          convisoApiBase,
          hasApiKey: !!convisoApiKey,
          apiKeyLength: convisoApiKey.length,
          apiKeyPrefix: convisoApiKey ? convisoApiKey.substring(0, 5) + '...' : 'N/A',
          fromProcessEnv: !!process.env['CONVISO_API_KEY']
        });

        if (!convisoApiKey) {
          console.warn('[Conviso Backend] CONVISO_API_KEY not set in process.env');
          console.warn('[Conviso Backend] Make sure CONVISO_API_KEY is in your .env file');
        }

        // Parse JSON body
        router.use(express.json());

        // GET /api/conviso/integration/:instanceId - Get integration by instanceId
        router.get('/integration/:instanceId', async (req, res) => {
          try {
            const { instanceId } = req.params;

            if (!instanceId) {
              return res.status(400).json({ error: 'instanceId is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            // Query to get integration by instanceId
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
              console.error('[Conviso Backend] GraphQL errors:', json.errors);
              return res.status(404).json({ error: 'Integration not found' });
            }

            const integration = json.data?.backstageIntegration;
            if (!integration) {
              return res.status(404).json({ error: 'Integration not found' });
            }

            // Load auto-import setting from integration metadata if available
            // This restores the setting after server restart
            if (integration.autoImportEnabled !== undefined) {
              autoImportSettings.set(instanceId, integration.autoImportEnabled);
              console.log(`[Conviso Backend] 📋 Loaded auto-import setting from integration: ${integration.autoImportEnabled} for instance ${instanceId}`);
            }

            // Get companyId from integration (we stored it when creating)
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
            console.error('[Conviso Backend] Error in GET /integration:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // POST /api/conviso/integration - Create/Update integration
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

            console.log('[Conviso Backend] Making GraphQL request to:', `${convisoApiBase}/graphql`);
            console.log('[Conviso Backend] API Key present:', !!convisoApiKey, 'Length:', convisoApiKey.length);

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

            console.log('[Conviso Backend] GraphQL response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('[Conviso Backend] GraphQL error:', errorText);
              return res.status(response.status).json({ error: errorText || 'Failed to create integration' });
            }

            const json = await response.json();
            if (json.errors) {
              console.error('[Conviso Backend] GraphQL errors:', json.errors);
              return res.status(500).json({ error: json.errors[0]?.message || 'GraphQL error' });
            }

            // Store companyId for this instance
            instanceCompanyIds.set(instanceId, parseInt(companyId.toString(), 10));

            res.json(json.data.createOrUpdateBackstageIntegration);
          } catch (error: any) {
            console.error('[Conviso Backend] Error in /integration:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // POST /api/conviso/auto-import - Enable/disable auto-import
        router.post('/auto-import', async (req, res) => {
          try {
            const { instanceId, enabled, companyId: companyIdFromRequest } = req.body;

            if (instanceId === undefined || enabled === undefined) {
              return res.status(400).json({ error: 'instanceId and enabled are required' });
            }

            console.log(`[Conviso Backend] 🔄 Auto-import setting changed for instance ${instanceId}: ${enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            
            autoImportSettings.set(instanceId, enabled);
            
            // If companyId is provided in the request, save it
            // This allows the frontend to send companyId from localStorage
            let companyId: number | undefined = companyIdFromRequest ? parseInt(companyIdFromRequest.toString(), 10) : instanceCompanyIds.get(instanceId);
            
            if (companyIdFromRequest && companyId !== undefined) {
              instanceCompanyIds.set(instanceId, companyId);
              console.log(`[Conviso Backend] 💾 Saved companyId ${companyId} from request for instance ${instanceId}`);
            }
            
            // Persist auto-import setting to Conviso Platform integration metadata
            if (companyId) {
              try {
                // Get current integration to preserve other fields
                const integrationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/conviso/integration/${instanceId}`);
                let backstageUrl = '';
                if (integrationResponse.ok) {
                  const integrationData = await integrationResponse.json();
                  backstageUrl = integrationData.integration?.backstageUrl || '';
                }
                
                // Update integration with auto_import_enabled in metadata
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
                      console.error('[Conviso Backend] Error updating auto-import in integration:', updateJson.errors);
                    } else {
                      console.log(`[Conviso Backend] ✅ Persisted auto-import setting (${enabled}) to Conviso Platform integration`);
                    }
                  }
                }
              } catch (error: any) {
                console.warn(`[Conviso Backend] ⚠️ Could not persist auto-import setting to Conviso Platform:`, error.message);
                // Continue anyway - the setting is saved in memory
              }
            }
            
            // If enabling, trigger immediate check in background
            if (enabled) {
              let companyId = instanceCompanyIds.get(instanceId);
              
              // If still no companyId, try to fetch it from the integration endpoint
              if (!companyId) {
                console.log(`[Conviso Backend] 🔍 companyId not in memory for instance ${instanceId}, trying to fetch from integration...`);
                
                // Try to get from the GET /integration endpoint
                try {
                  const integrationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/conviso/integration/${instanceId}`);
                  if (integrationResponse.ok) {
                    const integrationData = await integrationResponse.json();
                    if (integrationData.companyId) {
                      companyId = parseInt(integrationData.companyId.toString(), 10);
                      instanceCompanyIds.set(instanceId, companyId);
                      console.log(`[Conviso Backend] ✅ Found and saved companyId ${companyId} for instance ${instanceId}`);
                    } else {
                      console.warn(`[Conviso Backend] ⚠️ Integration endpoint did not return companyId for instance ${instanceId}`);
                    }
                  }
                } catch (fetchError: any) {
                  console.warn(`[Conviso Backend] ⚠️ Could not fetch companyId from integration endpoint:`, fetchError.message);
                }
              }
              
              if (companyId) {
                console.log(`[Conviso Backend] 🚀 Auto-import enabled, triggering immediate background check for company ${companyId}...`);
                // Run check in background (don't wait for result)
                setTimeout(() => {
                  checkAndImportNewEntities().catch((error: any) => {
                    console.error('[Conviso Backend] Error in immediate auto-import check:', error);
                  });
                }, 1000); // Small delay to ensure response is sent first
              } else {
                console.warn(`[Conviso Backend] ⚠️ Auto-import enabled but no companyId found for instance ${instanceId}`);
                console.warn(`[Conviso Backend] ⚠️ Please create/update the integration first with companyId`);
                console.warn(`[Conviso Backend] ⚠️ The auto-import will work once the integration is created`);
              }
            }
            
            res.json({ success: true, enabled });
          } catch (error: any) {
            console.error('[Conviso Backend] Error in /auto-import:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // GET /api/conviso/auto-import - Get auto-import setting
        router.get('/auto-import/:instanceId', async (req, res) => {
          try {
            const { instanceId } = req.params;
            const enabled = autoImportSettings.get(instanceId) || false;
            
            res.json({ enabled });
          } catch (error: any) {
            console.error('[Conviso Backend] Error in GET /auto-import:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // GET /api/conviso/imported-assets - Get list of already imported assets
        router.get('/imported-assets/:companyId', async (req, res) => {
          try {
            const { companyId } = req.params;

            if (!companyId) {
              return res.status(400).json({ error: 'Company ID is required' });
            }

            if (!convisoApiKey) {
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            // Query to get assets from Conviso Platform filtered by BACKSTAGE integration
            // Using the search filter to get only assets with BACKSTAGE integration
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

            // Get all assets with BACKSTAGE integration (with pagination if needed)
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
                console.error('[Conviso Backend] GraphQL error fetching assets:', errorText);
                break;
              }

              const json = await response.json();
              if (json.errors) {
                console.error('[Conviso Backend] GraphQL errors:', json.errors);
                break;
              }

              if (json.data?.assets?.collection) {
                const pageAssets = json.data.assets.collection;
                console.log(`[Conviso Backend] Page ${page}: fetched ${pageAssets.length} assets with BACKSTAGE integration`);
                allAssets = allAssets.concat(pageAssets);
                const totalPages = json.data.assets.metadata?.totalPages || 1;
                const totalCount = json.data.assets.metadata?.totalCount || 0;
                console.log(`[Conviso Backend] Page ${page}/${totalPages} - Total: ${totalCount} assets with BACKSTAGE integration`);
                hasMore = page < totalPages;
                page++;
              } else {
                console.log('[Conviso Backend] No assets collection in response');
                hasMore = false;
              }
            }

            console.log('[Conviso Backend] ==========================================');
            console.log('[Conviso Backend] Total assets with BACKSTAGE integration:', allAssets.length);
            if (allAssets.length > 0) {
              console.log('[Conviso Backend] Backstage asset names:', allAssets.map((a: any) => a.name));
            } else {
              console.log('[Conviso Backend] ⚠️ NO ASSETS WITH BACKSTAGE INTEGRATION FOUND!');
            }
            console.log('[Conviso Backend] ==========================================');

            res.json({
              assets: allAssets.map((asset: any) => ({
                id: asset.id,
                name: asset.name,
              })),
            });
          } catch (error: any) {
            console.error('[Conviso Backend] Error in GET /imported-assets:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // Helper function to extract project data from entity
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

        // Helper function to import a single entity
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

          console.log('[Conviso Backend] Auto-imported entity:', entity.metadata.name, json.data);
        }

        // Helper function to fetch companyId from Conviso Platform by instanceId
        // This is used when companyId is not in memory (e.g., after backend restart)
        async function fetchCompanyIdFromConviso(instanceId: string): Promise<number | null> {
          try {
            // Try to get integration from Conviso Platform
            // Note: The getBackstageIntegration query doesn't return companyId directly,
            // but we can try to infer it from the integration's scope_id
            // For now, we'll need to try a different approach - search through all companies
            // Actually, a simpler approach: try to get from the integration endpoint
            const query = `
              query GetBackstageIntegration($instanceId: String!) {
                backstageIntegration(instanceId: $instanceId) {
                  id
                }
              }
            `;

            // Since we can't get companyId directly, we'll need to store it when creating
            // But for now, let's try to get it from the integration's metadata
            // Actually, the best approach is to ensure it's always saved when integration is created
            // For now, return null and log a warning
            console.warn(`[Conviso Backend] ⚠️ Cannot fetch companyId from Conviso Platform for instance ${instanceId}`);
            console.warn(`[Conviso Backend] ⚠️ CompanyId should be stored when integration is created`);
            return null;
          } catch (error: any) {
            console.error(`[Conviso Backend] Error fetching companyId for instance ${instanceId}:`, error);
            return null;
          }
        }

        // Helper function to get already imported assets from Conviso Platform
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
                console.error('[Conviso Backend] Error fetching imported assets:', response.status);
                break;
              }

              const json = await response.json();
              if (json.errors) {
                console.error('[Conviso Backend] GraphQL errors:', json.errors);
                break;
              }

              if (json.data?.assets?.collection) {
                const pageAssets = json.data.assets.collection;
                pageAssets.forEach((asset: any) => {
                  // Normalize name: lowercase, trim, remove extra spaces
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

            console.log(`[Conviso Backend] ✅ Found ${importedNames.size} already imported assets from Conviso Platform`);
            if (importedNames.size > 0) {
              console.log(`[Conviso Backend] Imported asset names (first 10):`, Array.from(importedNames).slice(0, 10));
            }
            return importedNames;
          } catch (error: any) {
            console.error('[Conviso Backend] Error getting imported assets:', error);
            return new Set<string>(); // Return empty set on error, will try to import anyway
          }
        }

        // Function to check and import new entities (used by both polling and manual trigger)
        // This runs in the background, independent of frontend - works even when user is not on the page
        async function checkAndImportNewEntities(): Promise<{ imported: number; errors: string[] }> {
          const results = { imported: 0, errors: [] as string[] };

          try {
            // Get all integrations with auto-import enabled
            const enabledInstances = Array.from(autoImportSettings.entries())
              .filter(([_, enabled]) => enabled)
              .map(([instanceId]) => ({
                instanceId,
                companyId: instanceCompanyIds.get(instanceId)
              }))
              .filter(inst => inst.companyId !== undefined);

            if (enabledInstances.length === 0) {
              console.log('[Conviso Backend] ⚠️ No instances with auto-import enabled - skipping check');
              console.log('[Conviso Backend] Debug - Current auto-import settings:', Array.from(autoImportSettings.entries()));
              console.log('[Conviso Backend] Debug - Current instance-company mappings:', Array.from(instanceCompanyIds.entries()));
              return results;
            }

            console.log(`[Conviso Backend] 🔄 Background auto-import: Checking ${enabledInstances.length} instance(s) with auto-import enabled`);
            enabledInstances.forEach(({ instanceId, companyId }) => {
              console.log(`[Conviso Backend]   - Instance ${instanceId} -> Company ${companyId}`);
            });

            for (const { instanceId, companyId } of enabledInstances) {
              try {
                // First, get all already imported assets from Conviso Platform
                // This ensures we don't import duplicates even after backend restarts
                console.log(`[Conviso Backend] Fetching already imported assets for company ${companyId}...`);
                const importedAssetNames = await getImportedAssetNames(companyId!);

                // Get all Component entities from catalog
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

                console.log(`[Conviso Backend] 📋 Found ${entities.items.length} Component entities in catalog for instance ${instanceId}`);

                // Find entities that are NOT imported (by comparing normalized names)
                // This ensures we only import what's not already in Conviso Platform
                const nonImportedEntities = entities.items.filter((entity: any) => {
                  const entityName = entity.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
                  const isImported = importedAssetNames.has(entityName);
                  
                  // Log first few for debugging
                  if (entities.items.indexOf(entity) < 5) {
                    console.log(`[Conviso Backend]   Entity "${entity.metadata.name}" (normalized: "${entityName}") -> ${isImported ? '✅ Already imported' : '❌ Not imported'}`);
                  }
                  
                  return !isImported;
                });

                console.log(`[Conviso Backend] 📊 Comparison result:`);
                console.log(`[Conviso Backend]   - Total entities in catalog: ${entities.items.length}`);
                console.log(`[Conviso Backend]   - Already imported in Conviso Platform: ${entities.items.length - nonImportedEntities.length}`);
                console.log(`[Conviso Backend]   - Will import (not imported yet): ${nonImportedEntities.length}`);

                if (nonImportedEntities.length === 0) {
                  console.log('[Conviso Backend] ✅ All entities are already imported');
                  continue;
                }

                // Import each non-imported entity
                for (const entity of nonImportedEntities) {
                  try {
                    await importEntityToConviso(entity, companyId!, instanceId);
                    results.imported++;
                    console.log('[Conviso Backend] ✅ Auto-imported entity:', entity.metadata.name);
                  } catch (error: any) {
                    const errorMsg = `Failed to auto-import ${entity.metadata.name}: ${error.message}`;
                    console.error('[Conviso Backend]', errorMsg);
                    results.errors.push(errorMsg);
                  }
                }
              } catch (error: any) {
                const errorMsg = `Error checking catalog for instance ${instanceId}: ${error.message}`;
                console.error('[Conviso Backend]', errorMsg);
                results.errors.push(errorMsg);
              }
            }
          } catch (error: any) {
            const errorMsg = `Error in catalog check: ${error.message}`;
            console.error('[Conviso Backend]', errorMsg);
            results.errors.push(errorMsg);
          }

          return results;
        }

        // Subscribe to catalog entity events
        try {
          // Note: This is a simplified approach. In production, you might want to use
          // a proper event broker or catalog service subscription
          console.log('[Conviso Backend] Setting up catalog event subscription...');
          
          // Polling approach: Check for new entities periodically
          // In a production setup, you'd want to use proper event subscription
          // Use very short interval for immediate import (30 seconds), longer for production (1 hour)
          // This ensures new entities are imported quickly, almost in real-time
          const pollingInterval = environment === 'production' 
            ? 60 * 60 * 1000  // 1 hour in production (backup mechanism)
            : 30 * 1000;       // 30 seconds in development/staging (almost real-time)

          // Start polling immediately and then at intervals
          // This function runs in the background continuously, independent of frontend
          const runPollingCycle = async () => {
            const timestamp = new Date().toISOString();
            console.log(`[Conviso Backend] 🔄 [${timestamp}] Starting background polling cycle...`);
            console.log(`[Conviso Backend] Current state:`);
            console.log(`[Conviso Backend]   - Auto-import settings:`, Array.from(autoImportSettings.entries()));
            console.log(`[Conviso Backend]   - Instance-company mappings:`, Array.from(instanceCompanyIds.entries()));
            
            const results = await checkAndImportNewEntities();
            
            if (results.imported > 0) {
              console.log(`[Conviso Backend] ✅ [${timestamp}] Polling cycle completed: ${results.imported} entity(ies) imported`);
            } else if (results.errors.length > 0) {
              console.error(`[Conviso Backend] ❌ [${timestamp}] Polling cycle completed with ${results.errors.length} error(s)`);
              results.errors.forEach((err, idx) => {
                console.error(`[Conviso Backend]   Error ${idx + 1}: ${err}`);
              });
            } else {
              console.log(`[Conviso Backend] ℹ️ [${timestamp}] Polling cycle completed: No new entities to import`);
            }
          };

          // Load persisted auto-import settings from Conviso Platform on startup
          // This ensures settings are restored after server restart
          const loadPersistedSettings = async () => {
            try {
              console.log('[Conviso Backend] 📋 Loading persisted auto-import settings from Conviso Platform...');
              
              // We need to query all Backstage integrations to restore their settings
              // For now, we'll load them when integrations are accessed via GET /integration
              // The GET /integration endpoint already loads auto-import settings
              console.log('[Conviso Backend] ℹ️ Auto-import settings will be loaded when integrations are accessed');
            } catch (error: any) {
              console.warn('[Conviso Backend] ⚠️ Could not load persisted settings on startup:', error.message);
            }
          };
          
          // Load persisted settings first, then start polling
          loadPersistedSettings();
          
          // Run immediately on startup (after a short delay to let backend initialize)
          setTimeout(() => {
            console.log('[Conviso Backend] 🚀 Running initial auto-import check on startup...');
            console.log('[Conviso Backend] Current auto-import settings:', Array.from(autoImportSettings.entries()));
            runPollingCycle();
          }, 5000); // 5 seconds delay on startup

          // Then run at intervals - this runs CONTINUOUSLY in background
          // IMPORTANT: setInterval continues running even when frontend is closed!
          const intervalId = setInterval(() => {
            runPollingCycle();
          }, pollingInterval);
          
          // Log that polling is active (this will appear in backend logs)
          console.log(`[Conviso Backend] ✅✅✅ BACKGROUND POLLING ACTIVATED ✅✅✅`);
          console.log(`[Conviso Backend] Interval ID: ${intervalId}`);
          console.log(`[Conviso Backend] Configuration:`);
          console.log(`[Conviso Backend]   - Initial check: in 5 seconds`);
          console.log(`[Conviso Backend]   - Polling interval: every ${pollingInterval / 1000} seconds`);
          console.log(`[Conviso Backend]   - Environment: ${environment}`);
          console.log(`[Conviso Backend]   ✅ Works in background: YES`);
          console.log(`[Conviso Backend]   ✅ Works when frontend closed: YES`);
          console.log(`[Conviso Backend]   ✅ Works when user not on page: YES`);
          console.log(`[Conviso Backend]   ✅ Will run until backend restarts: YES`);
          console.log(`[Conviso Backend] ✅✅✅ POLLING IS RUNNING IN BACKGROUND ✅✅✅`);
        } catch (error: any) {
          console.warn('[Conviso Backend] Could not set up catalog subscription:', error);
        }

        // POST /api/conviso/trigger-auto-import - Manually trigger auto-import check immediately
        // This can be called after creating a new entity to import it right away
        // Or can be used as a webhook from external systems
        router.post('/trigger-auto-import', async (_req, res) => {
          try {
            console.log('[Conviso Backend] ⚡ Immediate auto-import trigger requested');
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
            console.error('[Conviso Backend] Error in immediate auto-import trigger:', error);
            res.status(500).json({ 
              success: false,
              error: error.message || 'Internal server error',
              timestamp: new Date().toISOString()
            });
          }
        });

        // POST /api/conviso/test-auto-import - Alias for trigger-auto-import (for backward compatibility)
        router.post('/test-auto-import', async (_req, res) => {
          try {
            console.log('[Conviso Backend] Manual auto-import trigger requested (legacy endpoint)');
            const results = await checkAndImportNewEntities();
            
            res.json({
              success: true,
              imported: results.imported,
              errors: results.errors,
              message: `Imported ${results.imported} new entity(ies). ${results.errors.length} error(s) occurred.`
            });
          } catch (error: any) {
            console.error('[Conviso Backend] Error in manual auto-import trigger:', error);
            res.status(500).json({ 
              success: false,
              error: error.message || 'Internal server error' 
            });
          }
        });

        // POST /api/conviso/import-projects - Import projects to assets
        router.post('/import-projects', async (req, res) => {
          try {
            console.log('[Conviso Backend] /import-projects called');
            const { companyId, projects } = req.body;

            console.log('[Conviso Backend] Request body:', { 
              companyId, 
              projectsCount: projects?.length,
              projects: projects?.map((p: any) => ({ id: p.id, name: p.name }))
            });

            if (!projects || !Array.isArray(projects)) {
              console.error('[Conviso Backend] Invalid projects:', projects);
              return res.status(400).json({ error: 'projects array is required' });
            }

            if (!companyId) {
              console.error('[Conviso Backend] Missing companyId');
              return res.status(400).json({ error: 'Company ID is required' });
            }

            if (!convisoApiKey) {
              console.error('[Conviso Backend] API Key not configured');
              return res.status(500).json({ error: 'API Key not configured. Set CONVISO_API_KEY in .env file.' });
            }

            // GraphQL Ruby RelayClassicMutation always expects a single 'input' argument
            // The mutation arguments (company_id, projects) become fields of the auto-generated input object
            // GraphQL Ruby converts snake_case to camelCase in the query
            const mutation = `
              mutation ImportBackstageProjectsToAssets($input: ImportBackstageProjectsToAssetsInput!) {
                importBackstageProjectsToAssets(input: $input) {
                  success
                  importedCount
                  errors
                }
              }
            `;

            console.log('[Conviso Backend] Making GraphQL request to:', `${convisoApiBase}/graphql`);
            console.log('[Conviso Backend] Mutation variables:', {
              companyId: companyId.toString(),
              projectsCount: projects.length
            });

            // Prepare input object with companyId and projects
            // GraphQL Ruby RelayClassicMutation expects all arguments wrapped in 'input'
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

            console.log('[Conviso Backend] GraphQL response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('[Conviso Backend] GraphQL HTTP error:', response.status, errorText);
              return res.status(response.status).json({ error: errorText || 'Failed to import projects' });
            }

            const json = await response.json();
            console.log('[Conviso Backend] GraphQL response:', JSON.stringify(json, null, 2));
            
            if (json.errors) {
              console.error('[Conviso Backend] GraphQL errors:', json.errors);
              return res.status(500).json({ error: json.errors[0]?.message || 'GraphQL error' });
            }

            if (!json.data || !json.data.importBackstageProjectsToAssets) {
              console.error('[Conviso Backend] Invalid response structure:', json);
              return res.status(500).json({ error: 'Invalid response from GraphQL API' });
            }

            res.json(json.data.importBackstageProjectsToAssets);
          } catch (error: any) {
            console.error('[Conviso Backend] Error in /import-projects:', error);
            console.error('[Conviso Backend] Error stack:', error.stack);
            res.status(500).json({ error: error.message || 'Internal server error' });
          }
        });

        // Routes are automatically prefixed with /api/conviso (pluginId)
        httpRouter.use(router);
        console.log('[Conviso Backend] Routes registered:');
        console.log('[Conviso Backend]   - POST /api/conviso/integration');
        console.log('[Conviso Backend]   - POST /api/conviso/import-projects');
        console.log('[Conviso Backend]   - POST /api/conviso/auto-import');
        console.log('[Conviso Backend]   - GET  /api/conviso/imported-assets/:companyId');
        console.log('[Conviso Backend]   - POST /api/conviso/trigger-auto-import (⚡ Immediate import trigger)');
        console.log('[Conviso Backend]   - POST /api/conviso/test-auto-import (legacy)');
      },
    });
  },
});

export default convisoBackendPlugin;

