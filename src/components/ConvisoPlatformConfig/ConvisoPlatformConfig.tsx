import { Content, Header, HeaderLabel, InfoCard, Page, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Grid, Tab, Tabs, Typography } from '@material-ui/core';
import { OpenInNew } from '@material-ui/icons';
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
  const [platformUrl, setPlatformUrl] = useState<string>('https://app.convisoappsec.com/');

  const instanceId = useMemo(() => {
    const stored = localStorage.getItem('conviso_backstage_instance_id');
    if (stored) return stored;
    const newId = generateInstanceId();
    localStorage.setItem('conviso_backstage_instance_id', newId);
    return newId;
  }, []);


  const backstageUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, []);

  useEffect(() => {
    async function checkIntegration() {
      setLoadingIntegration(true);
      try {
        const savedIntegrationId = localStorage.getItem('conviso_integration_id');
        
        let integrationRestored = false;
        
        try {
          const result = await api.getIntegration(instanceId);
          if (result && result.integration) {
            setIntegration(result.integration);
            if (result.integration.id) {
              localStorage.setItem('conviso_integration_id', result.integration.id);
            }
            integrationRestored = true;
          } else if (savedIntegrationId) {
            setIntegration({
              id: savedIntegrationId,
              backstageUrl: backstageUrl,
              instanceId: instanceId,
              updatedAt: new Date().toISOString(),
            });
            integrationRestored = true;
          }
        } catch {
          // Error handled by UI state
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
        
        if (integrationRestored || savedIntegrationId) {
          setActiveTab(1);
        }
      } catch {
        // Error handled by UI state
      } finally {
        setLoadingIntegration(false);
      }
    }
    
    async function loadConfig() {
      try {
        const config = await api.getConfig();
        setPlatformUrl(config.platformUrl);
      } catch {
        // Error handled silently - config is optional
      }
    }
    
    checkIntegration();
    loadConfig();
  }, [api, instanceId, backstageUrl]);


  async function handleCreateIntegration() {
    setSubmitting(true);
    try {
      setErrorMessage(undefined);
      setSuccessMessage(undefined);

      const result = await api.createOrUpdateBackstageIntegration({
        backstageUrl: backstageUrl,
        instanceId: instanceId,
      } as any);

      const updatedIntegration = result?.backstageIntegration;

      if (updatedIntegration) {
        setIntegration(updatedIntegration);
        localStorage.setItem('conviso_integration_id', updatedIntegration.id);
        setSuccessMessage('Integration created/updated successfully!');
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
      <Header title="Conviso" subtitle="Conviso Platform Integration">
        <HeaderLabel label="Owner" value="Conviso" />
        <HeaderLabel label="Lifecycle" value="Alpha" />
        <a href={platformUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginLeft: '16px' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNew />}
          >
            Open Conviso Platform
          </Button>
        </a>
      </Header>
      <Content>
        <div>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            className="conviso-tabs"
          >
            <Tab 
              label="Configure Integration" 
              className="conviso-tab"
            />
            {integration && (
              <Tab 
                label="Import Projects" 
                className="conviso-tab"
              />
            )}
          </Tabs>
        </div>
        {activeTab === 0 && (
        <Grid container spacing={3} direction="column">
          <Grid item>
            <InfoCard title="Conviso Platform Integration" className="conviso-info-card">
              {loadingIntegration ? (
                <Progress />
              ) : (
              <Grid container spacing={3} direction="column">
                {errorMessage ? (
                  <Grid item>
                    <WarningPanel title="Integration Error">{errorMessage}</WarningPanel>
                  </Grid>
                ) : null}
                {successMessage ? (
                  <Grid item>
                    <Typography variant="body2" color="primary">{successMessage}</Typography>
                  </Grid>
                ) : null}
                <Grid item>
                  <Typography variant="body1" gutterBottom>
                    Connect your Backstage catalog to Conviso Platform to sync components as security assets. 
                    This integration enables automatic import of Backstage entities into Conviso Platform for security management. 
                    The Company ID is automatically configured from the backend settings.
                  </Typography>
                </Grid>
                <Grid item>
                  {submitting ? (
                    <Progress />
                  ) : (
                    <Button 
                      variant="contained" 
                      className="conviso-button-primary"
                      onClick={handleCreateIntegration}
                      disabled={submitting}
                    >
                      Create / Update Integration
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
          }} />
        )}
      </Content>
    </Page>
  );
};



