import {
  registerMswTestHooks,
  renderInTestApp,
} from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ExampleComponent } from './ExampleComponent';

describe('ExampleComponent', () => {
  const server = setupServer();
  // Enable sane handlers for network requests
  registerMswTestHooks(server);

  // setup mock response
  beforeEach(() => {
    server.use(
      http.get('/*', () => HttpResponse.json({})),
    );
  });

  it('should render', async () => {
    await renderInTestApp(<ExampleComponent />);
    expect(
      screen.getByText('Welcome to backstage-plugin-conviso!'),
    ).toBeInTheDocument();
  });
});
