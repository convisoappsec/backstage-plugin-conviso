import { ContentHeader, InfoCard, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Button, Checkbox, Chip, FormControlLabel, Grid, Switch, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { useCallback, useEffect, useState } from 'react';
import { BackstageProject, convisoPlatformApiRef } from '../../api/convisoPlatformApi';

interface Entity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    description?: string;
    annotations?: Record<string, string>;
    tags?: string[];
    links?: Array<{ url: string; title?: string }>;
  };
  spec?: {
    lifecycle?: string;
    owner?: string;
    type?: string;
  };
}

interface ProjectSelectorProps {
  onImportSuccess?: () => void;
}

export const ProjectSelector = ({ onImportSuccess }: ProjectSelectorProps) => {
  const catalogApi = useApi(catalogApiRef);
  const api = useApi(convisoPlatformApiRef);
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [importedAssets, setImportedAssets] = useState<Set<string>>(new Set());
  const [autoImportEnabled, setAutoImportEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('conviso_auto_import_enabled');
    return saved === 'true';
  });

  // Get instanceId from localStorage
  const instanceId = localStorage.getItem('conviso_backstage_instance_id') || '';

  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoading(true);
        setErrorMessage(undefined);
        console.log('[Conviso] Fetching entities from catalog...');
        console.log('[Conviso] catalogApi:', catalogApi);
        
        // Fetch all Component entities from catalog
        // Use fields to limit what we fetch, and no limit to get all entities
        const response = await catalogApi.getEntities({
          filter: {
            kind: 'Component',
          },
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
        });
        
        console.log('[Conviso] Response:', response);
        console.log('[Conviso] Items array length:', response.items?.length || 0);
        console.log('[Conviso] Total items fetched:', response.items.length);
        
        // Log all entity names for debugging
        if (response.items && response.items.length > 0) {
          const allNames = response.items.map((e: any) => e.metadata?.name || 'UNNAMED').filter(Boolean);
          console.log('[Conviso] 🔍 All entity names found:', allNames);
          console.log('[Conviso] 📊 Total entities:', allNames.length);
          
          // Warn if we're getting less than expected
          if (allNames.length < 20) {
            console.warn('[Conviso] ⚠️ WARNING: Only', allNames.length, 'entities found. Expected ~26 from conviso-example-entities.yaml');
            console.warn('[Conviso] ⚠️ This might mean:');
            console.warn('[Conviso] ⚠️ 1. Backstage hasn\'t processed all entities yet - try restarting the backend');
            console.warn('[Conviso] ⚠️ 2. Some entities are being filtered out');
            console.warn('[Conviso] ⚠️ 3. There\'s a limit in the catalog API response');
          }
        } else {
          console.warn('[Conviso] ⚠️ No items found in response!');
        }
        
        // Filter to only Components with valid data
        const validEntities = response.items.filter((item: any) => {
          const isValid = item.kind === 'Component' && item.metadata?.name;
          if (!isValid && item.kind === 'Component') {
            console.warn('[Conviso] Invalid entity (missing name):', item);
          }
          return isValid;
        }) as Entity[];
        
        console.log('[Conviso] ✅ Valid entities after filtering:', validEntities.length);
        console.log('[Conviso] Valid entity names:', validEntities.map(e => e.metadata.name));
        
        // Log complete structure of first entity to see all available fields
        if (validEntities.length > 0 && validEntities[0]) {
          const firstEntity = validEntities[0];
          console.log('[Conviso] 📋 ESTRUTURA COMPLETA DA ENTIDADE (primeira entidade):');
          console.log(JSON.stringify(firstEntity, null, 2));
          console.log('[Conviso] 📋 METADATA completo:');
          console.log(JSON.stringify(firstEntity.metadata || {}, null, 2));
          console.log('[Conviso] 📋 SPEC completo:');
          console.log(JSON.stringify(firstEntity.spec || {}, null, 2));
          console.log('[Conviso] 📋 ANNOTATIONS disponíveis:');
          console.log(JSON.stringify(firstEntity.metadata?.annotations || {}, null, 2));
          console.log('[Conviso] 📋 LINKS disponíveis:');
          console.log(JSON.stringify(firstEntity.metadata?.links || [], null, 2));
          console.log('[Conviso] 📋 RELATIONS disponíveis (se houver):');
          console.log(JSON.stringify((firstEntity as any).relations || [], null, 2));
        }
        setEntities(validEntities);
        
        if (validEntities.length === 0) {
          setErrorMessage('No components found in the catalog. Make sure you have components registered in Backstage.');
        }
      } catch (e: any) {
        console.error('[Conviso] Error fetching entities:', e);
        console.error('[Conviso] Error details:', {
          message: e?.message,
          stack: e?.stack,
          name: e?.name,
          toString: e?.toString(),
        });
        setErrorMessage(`Failed to load entities: ${e?.message || 'Unknown error'}. Check console for details.`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchEntities();
  }, [catalogApi]);

  // Function to refresh imported assets from Conviso Platform
  // Memoized to avoid recreating on every render
  const refreshImportedAssets = useCallback(async (companyId: number): Promise<Set<string>> => {
    try {
      console.log('[Conviso] Fetching imported assets from Conviso Platform...');
      const result = await api.getImportedAssets(companyId);
      
      // Create a set of imported asset names (case-insensitive comparison)
      // Normalize names: lowercase, trim, remove extra spaces
      const importedNames = new Set(
        result.assets.map((asset) => {
          const normalized = asset.name.toLowerCase().trim().replace(/\s+/g, ' ');
          console.log('[Conviso] Found imported asset:', asset.name, '-> normalized:', normalized);
          return normalized;
        })
      );
      
      console.log('[Conviso] Loaded imported assets:', importedNames.size, 'assets');
      console.log('[Conviso] Imported asset names (normalized):', Array.from(importedNames));
      console.log('[Conviso] Original asset names:', result.assets.map(a => a.name));
      
      // Verify the set is correct
      if (importedNames.size !== result.assets.length) {
        console.warn('[Conviso] ⚠️ WARNING: Set size mismatch! Expected', result.assets.length, 'but got', importedNames.size);
        console.warn('[Conviso] This might indicate duplicate names after normalization');
      }
      
      setImportedAssets(importedNames);
      return importedNames;
    } catch (e: any) {
      console.warn('[Conviso] Could not load imported assets:', e);
      throw e;
    }
  }, [api]);

  // Fetch imported assets from Conviso Platform on mount and whenever entities change
  useEffect(() => {
    async function fetchImportedAssets() {
      const companyIdStr = localStorage.getItem('conviso_company_id');
      if (!companyIdStr || isNaN(parseInt(companyIdStr, 10))) {
        console.log('[Conviso] ⚠️ No company ID found, skipping asset fetch');
        console.log('[Conviso] localStorage keys:', Object.keys(localStorage).filter(k => k.includes('conviso')));
        return;
      }

      console.log('[Conviso] 🔄 Starting to fetch imported assets on mount...');
      console.log('[Conviso] Company ID from localStorage:', companyIdStr);
      
      try {
        const importedNames = await refreshImportedAssets(parseInt(companyIdStr, 10));
        console.log('[Conviso] ✅ Successfully loaded', importedNames.size, 'imported assets on mount');
        console.log('[Conviso] Imported names:', Array.from(importedNames));
        
        // Log entity names for comparison
        if (entities.length > 0) {
          console.log('[Conviso] 📋 Comparing with entities:');
          entities.slice(0, 5).forEach((entity, idx) => {
            const entityName = entity.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
            const isImported = importedNames.has(entityName);
            console.log(`[Conviso]   ${idx + 1}. "${entity.metadata.name}" -> "${entityName}" -> ${isImported ? '✅ Imported' : '❌ Not Imported'}`);
          });
        }
      } catch (e: any) {
        console.error('[Conviso] ❌ Could not load imported assets on mount:', e);
        console.error('[Conviso] Error details:', {
          message: e?.message,
          stack: e?.stack,
          name: e?.name,
        });
        // Don't show error to user, just continue without validation
      }
    }

    // Fetch imported assets - always try to fetch, even if entities are still loading
    // This ensures we have the data ready when entities are loaded
    fetchImportedAssets();
  }, [api, refreshImportedAssets]);

  // Load auto-import setting from backend
  // Also try to load from integration if available (persisted in Conviso Platform)
  useEffect(() => {
    if (instanceId) {
      // First try to get from integration (persisted in Conviso Platform)
      const companyIdStr = localStorage.getItem('conviso_company_id');
      if (companyIdStr) {
        api.getIntegration(instanceId).then((result) => {
          if (result?.integration?.autoImportEnabled !== undefined) {
            setAutoImportEnabled(result.integration.autoImportEnabled);
            console.log('[Conviso] Loaded auto-import setting from integration:', result.integration.autoImportEnabled);
          }
        }).catch((e: any) => {
          console.warn('[Conviso] Could not load integration:', e);
        });
      }
      
      // Also try backend endpoint (fallback)
      api.getAutoImport(instanceId).then((setting) => {
        setAutoImportEnabled(setting.enabled);
      }).catch((e: any) => {
        console.warn('[Conviso] Could not load auto-import setting:', e);
      });
    }
  }, [api, instanceId]);

  // Save auto-import setting to localStorage and update backend
  useEffect(() => {
    localStorage.setItem('conviso_auto_import_enabled', String(autoImportEnabled));
    if (instanceId) {
      // Get companyId from localStorage to send to backend
      const companyIdStr = localStorage.getItem('conviso_company_id');
      const companyId = companyIdStr ? parseInt(companyIdStr, 10) : undefined;
      
      api.setAutoImport(instanceId, autoImportEnabled, companyId).catch((e: any) => {
        console.error('[Conviso] Failed to update auto-import setting:', e);
      });
    }
  }, [autoImportEnabled, instanceId, api]);

  // Note: Auto-import is handled by the backend in the background
  // The backend polls every 30 seconds (dev) or 1 hour (prod) and imports automatically
  // No need for frontend logic - it works even when the user is not on this page

  const getEntityId = (entity: Entity): string => {
    const namespace = entity.metadata.namespace || 'default';
    return `${entity.kind}:${namespace}/${entity.metadata.name}`;
  };

  const extractProjectData = (entity: Entity): BackstageProject => {
    const entityId = getEntityId(entity);
    const annotations = entity.metadata.annotations || {};
    const links = entity.metadata.links || [];
    
    // Extract repository URL
    const sourceLocation = annotations['backstage.io/source-location'];
    const githubUrl = annotations['github.com/project-slug'];
    let repoUrl = githubUrl ? `https://github.com/${githubUrl}` : undefined;
    
    // Extract source-location URL (remove 'url:' prefix if present)
    if (sourceLocation && sourceLocation.startsWith('url:')) {
      repoUrl = sourceLocation.replace(/^url:/, '');
    } else if (sourceLocation) {
      repoUrl = sourceLocation;
    }

    // Extract URL from links - prioritize production/app/website links
    let url: string | undefined = undefined;
    const linkPriorities = ['production', 'app', 'website', 'site', 'url', 'homepage', 'home'];
    
    // First, try to find a link with a relevant title
    for (const priority of linkPriorities) {
      const relevantLink = links.find(link => 
        link.title && link.title.toLowerCase().includes(priority.toLowerCase())
      );
      if (relevantLink?.url) {
        url = relevantLink.url;
        break;
      }
    }
    
    // If no priority link found, try to find any link with http/https
    if (!url) {
      const httpLink = links.find(link => 
        link && link.url && (link.url.startsWith('http://') || link.url.startsWith('https://'))
      );
      if (httpLink && httpLink.url) {
        url = httpLink.url;
      } else if (links.length > 0 && links[0] && links[0].url) {
        // Fallback to first link
        url = links[0].url;
      }
    }

    // Also check view-url annotation
    const viewUrl = annotations['backstage.io/view-url'];
    if (viewUrl && !url) {
      url = viewUrl;
    }

    const project: BackstageProject = {
      id: entityId,
      name: entity.metadata.name,
    };

    // Basic fields
    if (entity.metadata.description) {
      project.description = entity.metadata.description;
    }
    if (url) {
      project.url = url;
    }
    if (repoUrl) {
      project.repoUrl = repoUrl;
    }
    if (entity.metadata.tags) {
      project.tags = entity.metadata.tags;
    }

    // Map lifecycle (Backstage) to life_cycle (Conviso) - ensure valid enum values
    if (entity.spec?.lifecycle) {
      const lifecycle = entity.spec.lifecycle.toLowerCase();
      // Conviso life_cycle: none, production, homologation, certification, discontinued
      // Backstage lifecycle: production, development, experimental, deprecated
      const lifecycleMap: Record<string, string> = {
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
      const mappedLifecycle = lifecycleMap[lifecycle] || 'production';
      project.lifecycle = mappedLifecycle;
    }

    // Map asset type - ensure valid enum values
    if (entity.spec?.type) {
      const assetType = entity.spec.type.toLowerCase();
      // Conviso asset_type: none, client_server, api, progressive_web_app, web, native_mobile, 
      // hybrid_mobile, database, dmz, legacy, cluster, node
      // Backstage type: service, website, library, etc.
      const assetTypeMap: Record<string, string> = {
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
      const mappedAssetType = assetTypeMap[assetType] || 'api';
      project.assetType = mappedAssetType;
    }

    // Owner
    if (entity.spec?.owner) {
      project.owner = entity.spec.owner;
    }

    return project;
  };

  const handleToggleProject = (entityId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === entities.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(entities.map(e => getEntityId(e))));
    }
  };

  const handleImport = async () => {
    if (selectedProjects.size === 0) {
      setErrorMessage('Please select at least one project to import');
      return;
    }

    // Get companyId from localStorage
    const companyIdStr = localStorage.getItem('conviso_company_id');
    if (!companyIdStr || isNaN(parseInt(companyIdStr, 10))) {
      setErrorMessage('Company ID not found. Please go back to the Configure Integration tab and enter your Company ID.');
      return;
    }

    setImporting(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    try {
      // Filter out already imported entities
      // Normalize names the same way we do for comparison
      const projectsToImport = entities
        .filter(e => {
          const entityId = getEntityId(e);
          const entityName = e.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
          const isAlreadyImported = importedAssets.has(entityName);
          
          if (isAlreadyImported) {
            console.log('[Conviso] Skipping already imported:', e.metadata.name);
          }
          
          return selectedProjects.has(entityId) && !isAlreadyImported;
        })
        .map(extractProjectData);
        
      console.log('[Conviso] Projects to import:', projectsToImport.map(p => p.name));

      if (projectsToImport.length === 0) {
        setErrorMessage('All selected projects have already been imported');
        setImporting(false);
        return;
      }

      const result = await api.importBackstageProjectsToAssets({
        companyId: parseInt(companyIdStr, 10),
        projects: projectsToImport,
      });

      if (result.success) {
        setSuccessMessage(
          `Successfully imported ${result.importedCount} project(s)!`
        );
        setSelectedProjects(new Set());
        
        // Get expected imported names (normalized)
        const expectedImportedNames = projectsToImport.map(p => 
          p.name.toLowerCase().trim().replace(/\s+/g, ' ')
        );
        console.log('[Conviso] Expected imported names:', expectedImportedNames);
        
        // Immediately update local state with newly imported projects
        // This ensures immediate visual feedback
        const currentImported = new Set(importedAssets);
        expectedImportedNames.forEach(name => {
          if (name) {
            currentImported.add(name);
          }
        });
        setImportedAssets(currentImported);
        console.log('[Conviso] Immediately updated local state with', expectedImportedNames.length, 'projects');
        
        // Poll for imported assets until all expected assets appear in Conviso Platform
        // This ensures we sync with the real state from Conviso Platform
        const pollForImportedAssets = async (attempt: number = 1, maxAttempts: number = 5) => {
          if (attempt > maxAttempts) {
            console.warn('[Conviso] Max polling attempts reached, using local state');
            return;
          }

          try {
            console.log(`[Conviso] Polling for imported assets (attempt ${attempt}/${maxAttempts})...`);
            const companyId = parseInt(companyIdStr, 10);
            const refreshedNames = await refreshImportedAssets(companyId);
            
            // Check if all expected assets are now in the refreshed list
            const allFound = expectedImportedNames.every(name => refreshedNames.has(name));
            
            if (allFound) {
              console.log('[Conviso] ✅ All imported assets confirmed in Conviso Platform!');
            } else {
              // Some assets not found yet, try again after delay
              const missing = expectedImportedNames.filter(name => !refreshedNames.has(name));
              console.log('[Conviso] ⏳ Still waiting for assets:', missing);
              console.log('[Conviso] Will retry in 2 seconds...');
              
              setTimeout(() => {
                pollForImportedAssets(attempt + 1, maxAttempts);
              }, 2000); // 2 second delay between attempts
            }
          } catch (e: any) {
            console.warn('[Conviso] Error polling for imported assets:', e);
            // On error, keep the local state we already updated
          }
        };
        
        // Start polling after a short initial delay (backend needs time to process)
        setTimeout(() => {
          pollForImportedAssets(1, 5); // Try up to 5 times
        }, 2000); // Initial 2 second delay
        
        // Call callback if provided
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setErrorMessage(
          `Imported ${result.importedCount} project(s), but encountered errors: ${result.errors?.join(', ') || 'Unknown errors'}`
        );
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to import projects');
    } finally {
      setImporting(false);
    }
  };

  const handleRefreshImportedAssets = async () => {
    const companyIdStr = localStorage.getItem('conviso_company_id');
    if (!companyIdStr || isNaN(parseInt(companyIdStr, 10))) {
      setErrorMessage('Company ID not found. Please go back to the Configure Integration tab and enter your Company ID.');
      return;
    }

    try {
      console.log('[Conviso] Manual refresh triggered by user');
      await refreshImportedAssets(parseInt(companyIdStr, 10));
      setSuccessMessage('Imported assets list refreshed!');
    } catch (e: any) {
      setErrorMessage('Failed to refresh imported assets: ' + (e?.message || 'Unknown error'));
    }
  };

  return (
    <>
      <ContentHeader title="Select Projects">
        <Button
          variant="outlined"
          onClick={handleSelectAll}
          disabled={loading || importing || entities.length === 0 || autoImportEnabled}
          title={autoImportEnabled ? "Desative a Importação Automática para usar import manual" : ""}
        >
          {selectedProjects.size === entities.length ? 'Deselect All' : 'Select All'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleRefreshImportedAssets}
          disabled={loading || importing}
          style={{ marginLeft: 8 }}
          title="Refresh the list of imported assets from Conviso Platform"
        >
          Refresh Status
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleImport}
          disabled={loading || importing || selectedProjects.size === 0 || autoImportEnabled}
          style={{ marginLeft: 8 }}
          title={autoImportEnabled ? "Desative a Importação Automática para usar import manual" : ""}
        >
          Import Selected ({selectedProjects.size})
        </Button>
      </ContentHeader>
        <Grid container spacing={3} direction="column">
          {errorMessage && (
            <Grid item>
              <WarningPanel title="Import failed">{errorMessage}</WarningPanel>
            </Grid>
          )}
          {successMessage && (
            <Grid item>
              <Typography variant="body2" color="primary">{successMessage}</Typography>
            </Grid>
          )}
          <Grid item>
            <InfoCard>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoImportEnabled}
                    onChange={(e) => setAutoImportEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label="Importação Automática"
              />
              <Typography variant="caption" display="block" color="textSecondary" style={{ marginTop: 8, marginLeft: 48 }}>
                Quando ativado, novas entidades criadas no Backstage serão automaticamente importadas para o Conviso Platform em background.
                <br />
                <strong>Funciona mesmo quando você não está nesta tela!</strong> O backend verifica a cada 30 segundos (desenvolvimento) ou 1 hora (produção).
                <br />
                {autoImportEnabled && (
                  <strong style={{ color: '#ff9800', display: 'block', marginTop: 4 }}>
                    ⚠️ Import manual está desabilitado enquanto a importação automática estiver ativa.
                  </strong>
                )}
              </Typography>
            </InfoCard>
          </Grid>
          <Grid item>
            <InfoCard title={`Available Components (${entities.length})`}>
              {loading ? (
                <Progress />
              ) : entities.length === 0 ? (
                <Typography variant="body1">No components found in the catalog.</Typography>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedProjects.size === entities.length && entities.length > 0}
                          indeterminate={selectedProjects.size > 0 && selectedProjects.size < entities.length}
                          onChange={handleSelectAll}
                          disabled={autoImportEnabled}
                          title={autoImportEnabled ? "Desative a Importação Automática para selecionar projetos manualmente" : ""}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Lifecycle</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entities.map((entity) => {
                      const entityId = getEntityId(entity);
                      const isSelected = selectedProjects.has(entityId);
                      // Normalize entity name for comparison (same normalization as assets)
                      const entityName = entity.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
                      const isImported = importedAssets.has(entityName);
                      
                      // Debug log for all entities (helps identify matching issues)
                      if (entities.indexOf(entity) < 10) {
                        console.log(`[Conviso] Entity ${entities.indexOf(entity) + 1}:`, {
                          name: entity.metadata.name,
                          normalized: entityName,
                          imported: isImported,
                          inSet: importedAssets.has(entityName),
                          setSize: importedAssets.size,
                          importedAssetsArray: Array.from(importedAssets).slice(0, 5), // Show first 5 for debugging
                        });
                      }
                      
                      // Additional debug: Check if ALL entities are showing as imported incorrectly
                      if (entities.indexOf(entity) === 0) {
                        console.log('[Conviso] 🔍 DEBUG - First entity check:');
                        console.log('[Conviso]   - importedAssets.size:', importedAssets.size);
                        console.log('[Conviso]   - importedAssets contents:', Array.from(importedAssets));
                        console.log('[Conviso]   - Total entities:', entities.length);
                        const importedCount = entities.filter(e => {
                          const en = e.metadata.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
                          return importedAssets.has(en);
                        }).length;
                        console.log('[Conviso]   - Entities marked as imported:', importedCount);
                        console.log('[Conviso]   - Entities NOT imported:', entities.length - importedCount);
                      }
                      return (
                        <TableRow 
                          key={entityId} 
                          selected={isSelected}
                          style={{ 
                            // Add left border for imported items instead of background color
                            borderLeft: isImported ? '4px solid #4caf50' : 'none',
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleProject(entityId)}
                              disabled={isImported || autoImportEnabled}
                              title={autoImportEnabled ? "Desative a Importação Automática para selecionar projetos manualmente" : ""}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              style={{ 
                                fontWeight: isImported ? 'normal' : 'medium',
                              }}
                            >
                              {entity.metadata.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {entity.metadata.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {entity.spec?.owner || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {entity.spec?.lifecycle || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {entity.spec?.type || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {isImported ? (
                              <Chip
                                icon={<CheckCircleIcon style={{ fontSize: 16, color: 'white' }} />}
                                label="Imported"
                                size="small"
                                style={{ 
                                  backgroundColor: '#4caf50', 
                                  color: 'white',
                                  fontWeight: 'bold',
                                }}
                              />
                            ) : (
                              <Chip
                                label="Not Imported"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </InfoCard>
          </Grid>
        </Grid>
    </>
  );
};

