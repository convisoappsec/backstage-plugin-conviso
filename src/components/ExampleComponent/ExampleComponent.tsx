import {
  Content,
  ContentHeader,
  Header,
  HeaderLabel,
  InfoCard,
  Page,
  SupportButton,
} from '@backstage/core-components';
import { Typography } from '@material-ui/core';

export const ExampleComponent = () => (
  <Page themeId="tool">
    <Header title="Conviso Platform Integration" subtitle="Sync your Backstage projects with Conviso Platform">
      <HeaderLabel label="Owner" value="Conviso" />
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>
    <Content>
      <ContentHeader title="Plugin Configuration">
        <SupportButton>Configure your Conviso Platform integration here.</SupportButton>
      </ContentHeader>
      <InfoCard title="Welcome to Conviso Platform Integration">
        <Typography variant="body1">
          This plugin allows you to sync your Backstage catalog projects with Conviso Platform as security assets.
        </Typography>
        <Typography variant="body2" style={{ marginTop: 16 }}>
          Features:
        </Typography>
        <ul>
          <li>🔐 API Key authentication</li>
          <li>🌍 Environment selection (Production/Staging)</li>
          <li>🔄 Project synchronization</li>
          <li>📊 Security dashboard</li>
        </ul>
      </InfoCard>
    </Content>
  </Page>
);
