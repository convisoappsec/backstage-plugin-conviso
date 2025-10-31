import { Content, ContentHeader, Header, HeaderLabel, InfoCard, Page, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Grid, TextField, Typography } from '@material-ui/core';
import { useMemo, useState } from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';

function generateInstanceId(): string {
  return `backstage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const ConvisoPlatformConfig = () => {
  const api = useApi(convisoPlatformApiRef);
  const [companyId, setCompanyId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  // Gera um instanceId único e persistente (usando localStorage)
  const instanceId = useMemo(() => {
    const stored = localStorage.getItem('conviso_backstage_instance_id');
    if (stored) return stored;
    const newId = generateInstanceId();
    localStorage.setItem('conviso_backstage_instance_id', newId);
    return newId;
  }, []);

  // Captura a URL base do Backstage
  const backstageUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, []);

  async function handleCreateIntegration() {
    if (!companyId.trim()) {
      setErrorMessage('Company ID is required');
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

      const integration = result?.backstageIntegration;

      if (integration) {
        setIntegrationId(integration.id);
        setSuccessMessage(
          `Integration ${integration.id ? 'updated' : 'created'} successfully! ID: ${integration.id}`
        );
      } else {
        setSuccessMessage('Integration created/updated successfully!');
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
        <Grid container spacing={3} direction="column">
          <Grid item>
            <InfoCard title="Backstage Integration">
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
                    This plugin uses Backstage proxy to authenticate and call Conviso Platform GraphQL. Enter your Company ID below and click the button to create/update the Backstage integration.
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    label="Company ID"
                    type="text"
                    variant="outlined"
                    fullWidth
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    placeholder="Enter your Conviso Platform Company ID"
                    disabled={submitting}
                  />
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="textSecondary">
                    Backstage URL: {backstageUrl || 'Not available'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Instance ID: {instanceId}
                  </Typography>
                </Grid>
                <Grid item>
                  {submitting ? (
                    <Progress />
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleCreateIntegration}
                      disabled={!companyId.trim()}
                    >
                      {integrationId ? 'Update Integration' : 'Create Integration'}
                    </Button>
                  )}
                </Grid>
              </Grid>
            </InfoCard>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};


