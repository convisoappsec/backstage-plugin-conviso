import { Content, Header, HeaderLabel, InfoCard, Page, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Grid, Tab, Tabs, Typography } from '@material-ui/core';
import { useEffect, useMemo, useState } from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';
import '../../styles/conviso-theme.css';
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
            if (result.companyId) {
              localStorage.setItem('conviso_company_id', result.companyId.toString());
            }
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
        } catch (e: any) {
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
      } catch (e: any) {
      } finally {
        setLoadingIntegration(false);
      }
    }
    
    checkIntegration();
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
      </Header>
      <Content>
        <div style={{ marginBottom: 24 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            className="conviso-tabs"
            style={{ borderBottom: '2px solid #e0e0e0' }}
          >
            <Tab 
              label="Configure Integration" 
              className="conviso-tab"
              style={{ 
                color: activeTab === 0 ? '#0a2540' : '#666666',
                fontWeight: activeTab === 0 ? 700 : 500,
                borderBottom: activeTab === 0 ? '3px solid #FFB800' : 'none'
              }}
            />
            {integration && (
              <Tab 
                label="Import Projects" 
                className="conviso-tab"
                style={{ 
                  color: activeTab === 1 ? '#0a2540' : '#666666',
                  fontWeight: activeTab === 1 ? 700 : 500,
                  borderBottom: activeTab === 1 ? '3px solid #FFB800' : 'none'
                }}
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
                      style={{
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        fontWeight: 600,
                        padding: '10px 24px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(44, 62, 80, 0.2)',
                      }}
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



