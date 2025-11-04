import { Content, ContentHeader, Header, HeaderLabel, InfoCard, Page, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Grid, Tab, Tabs, TextField, Typography } from '@material-ui/core';
import { useEffect, useMemo, useState } from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';
import { ProjectSelector } from '../ProjectSelector';

function generateInstanceId(): string {
  return `backstage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const ConvisoPlatformConfig = () => {
  const api = useApi(convisoPlatformApiRef);
  
  const [loadingIntegration, setLoadingIntegration] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [integration, setIntegration] = useState<{ id: string; backstageUrl: string; instanceId: string; updatedAt: string } | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Gera um instanceId único e persistente (usando localStorage)
  const instanceId = useMemo(() => {
    const stored = localStorage.getItem('conviso_backstage_instance_id');
    if (stored) return stored;
    const newId = generateInstanceId();
    localStorage.setItem('conviso_backstage_instance_id', newId);
    return newId;
  }, []);

  // Company ID from localStorage (load from saved integration if exists)
  const [companyId, setCompanyId] = useState<string>(() => {
    return localStorage.getItem('conviso_company_id') || '';
  });

  // Auto-import setting from localStorage
  const [autoImportEnabled, setAutoImportEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('conviso_auto_import_enabled');
    return saved === 'true';
  });

  // Captura a URL base do Backstage
  const backstageUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, []);

  // Check if integration exists on mount - restore from localStorage
  useEffect(() => {
    async function checkIntegration() {
      setLoadingIntegration(true);
      try {
        const savedIntegrationId = localStorage.getItem('conviso_integration_id');
        const savedCompanyId = localStorage.getItem('conviso_company_id');
        
        // If we have saved integration data, restore it immediately
        if (savedCompanyId) {
          setCompanyId(savedCompanyId);
          
          let integrationRestored = false;
          
          // Try to verify integration exists (optional check)
          try {
            const result = await api.getIntegration(instanceId);
            if (result && result.integration) {
              // Integration verified, use the data from backend
              setIntegration(result.integration);
              if (result.companyId) {
                setCompanyId(result.companyId.toString());
                localStorage.setItem('conviso_company_id', result.companyId.toString());
              }
              if (result.integration.id) {
                localStorage.setItem('conviso_integration_id', result.integration.id);
              }
              integrationRestored = true;
            } else if (savedIntegrationId) {
              // Backend check failed but we have saved data, restore from localStorage
              // Create a mock integration object from saved data
              setIntegration({
                id: savedIntegrationId,
                backstageUrl: backstageUrl,
                instanceId: instanceId,
                updatedAt: new Date().toISOString(),
              });
              integrationRestored = true;
            }
          } catch (e: any) {
            // If verification fails, restore from localStorage anyway
            console.warn('[Conviso] Could not verify integration, using saved data:', e);
            if (savedIntegrationId) {
              setIntegration({
                id: savedIntegrationId,
                backstageUrl: backstageUrl,
                instanceId: instanceId,
                updatedAt: new Date().toISOString(),
              });
              integrationRestored = true;
            }
          }
          
          // If we have integration data (from verification or localStorage), switch to import tab
          if (integrationRestored || savedIntegrationId) {
            setActiveTab(1);
            
            // Load auto-import setting
            try {
              const setting = await api.getAutoImport(instanceId);
              setAutoImportEnabled(setting.enabled);
            } catch (e: any) {
              console.warn('[Conviso] Could not load auto-import setting:', e);
            }
          }
        }
      } catch (e: any) {
        console.warn('[Conviso] Error checking integration:', e);
        // Don't clear saved data on error - keep it for next time
      } finally {
        setLoadingIntegration(false);
      }
    }
    
    checkIntegration();
  }, [api, instanceId, backstageUrl]); // Note: removed integration from deps to avoid infinite loop

  // Save companyId to localStorage when it changes
  useEffect(() => {
    if (companyId) {
      localStorage.setItem('conviso_company_id', companyId);
    }
  }, [companyId]);

  async function handleCreateIntegration() {
    if (!companyId || isNaN(parseInt(companyId, 10))) {
      setErrorMessage('Please enter a valid Company ID');
      return;
    }

    setSubmitting(true);
    try {
      setErrorMessage(undefined);
      setSuccessMessage(undefined);

      const result = await api.createOrUpdateBackstageIntegration({
        companyId: parseInt(companyId, 10),
        backstageUrl: backstageUrl,
        instanceId: instanceId,
      });

      const updatedIntegration = result?.backstageIntegration;

      if (updatedIntegration) {
        setIntegration(updatedIntegration);
        // Save integration_id and company_id to localStorage
        localStorage.setItem('conviso_integration_id', updatedIntegration.id);
        localStorage.setItem('conviso_company_id', companyId);
        setSuccessMessage('Integration created/updated successfully!');
        // Switch to Import Projects tab after successful creation
        setTimeout(() => setActiveTab(1), 100);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to create integration');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page themeId="tool">
      <Header title="Conviso Platform" subtitle="Configure the integration">
        <HeaderLabel label="Owner" value="Conviso" />
        <HeaderLabel label="Lifecycle" value="Alpha" />
      </Header>
      <Content>
        <ContentHeader title="Integration" />
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Configure Integration" />
          {integration && <Tab label="Import Projects" />}
        </Tabs>
        {activeTab === 0 && (
        <Grid container spacing={3} direction="column">
          <Grid item>
            <InfoCard title="Backstage Integration">
              {loadingIntegration ? (
                <Progress />
              ) : (
              <Grid container spacing={3} direction="column">
                {errorMessage ? (
                  <Grid item>
                    <WarningPanel title="Create integration failed">{errorMessage}</WarningPanel>
                  </Grid>
                ) : null}
                {successMessage ? (
                  <Grid item>
                    <Typography variant="body2" color="primary">{successMessage}</Typography>
                  </Grid>
                ) : null}
                <Grid item>
                  <Typography variant="body1" gutterBottom>
                    Enter your Conviso Platform Company ID and click the button below to create/update the Backstage integration.
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    label="Company ID"
                    type="number"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    fullWidth
                    required
                    helperText={integration ? "Changing Company ID will recreate the integration." : "Enter your Conviso Platform Company ID"}
                  />
                </Grid>
                <Grid item>
                  {submitting ? (
                    <Progress />
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleCreateIntegration}
                      disabled={submitting || !companyId}
                    >
                      {integration ? 'Update Integration' : 'Create Integration'}
                    </Button>
                  )}
                </Grid>
              </Grid>
              )}
            </InfoCard>
          </Grid>
        </Grid>
        )}
        {activeTab === 1 && integration && (
          <ProjectSelector onImportSuccess={() => {
            // After successful import, enable auto-import toggle visibility
          }} />
        )}
      </Content>
    </Page>
  );
};



