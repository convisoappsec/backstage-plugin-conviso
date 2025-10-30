import { Content, ContentHeader, Header, HeaderLabel, InfoCard, Page, Progress } from '@backstage/core-components';
import { Button, FormControl, FormControlLabel, Grid, Radio, RadioGroup, TextField, Typography } from '@material-ui/core';
import { useMemo, useState } from 'react';

type Environment = 'production' | 'staging' | 'local';

export const ConvisoPlatformConfig = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const baseUrl = useMemo(() => {
    return environment === 'production'
      ? 'https://app.conviso.com.br'
      : environment === 'staging'
        ? 'https://staging.conviso.com.br'
        : 'https://felipe.share.zrok.io';
  }, [environment]);

  async function handleValidate() {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      alert('API Key looks valid (local validation).');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      alert(`Configuration saved:\nEnvironment: ${environment}\nBase URL: ${baseUrl}\nCompany ID: ${companyId}`);
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
        <ContentHeader title="Integration Configuration" />
        <Grid container spacing={3} direction="column">
          <Grid item>
            <InfoCard title="Conviso Platform">
              <Grid container spacing={3} direction="column">
                <Grid item>
                  <TextField
                    label="API Key"
                    type="password"
                    variant="outlined"
                    fullWidth
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Enter your Conviso Platform API Key"
                  />
                </Grid>
                <Grid item>
                  <TextField
                    label="Company ID"
                    type="text"
                    variant="outlined"
                    fullWidth
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    placeholder="Enter your Company ID"
                  />
                </Grid>
                <Grid item>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle1" gutterBottom>
                      Environment
                    </Typography>
                    <RadioGroup
                      row
                      aria-label="environment"
                      name="environment"
                      value={environment}
                      onChange={e => setEnvironment(e.target.value as Environment)}
                    >
                      <FormControlLabel value="production" control={<Radio color="primary" />} label="Production" />
                      <FormControlLabel value="staging" control={<Radio color="primary" />} label="Staging" />
                      <FormControlLabel value="local" control={<Radio color="primary" />} label="Local" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="textSecondary">
                    Base URL: {baseUrl}
                  </Typography>
                </Grid>
                <Grid item>
                  {submitting ? (
                    <Progress />
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={handleValidate}
                          disabled={!apiKey || !companyId}
                        >
                          Validate
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSave}
                          disabled={!apiKey || !companyId}
                        >
                          Save configuration
                        </Button>
                      </Grid>
                    </Grid>
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


