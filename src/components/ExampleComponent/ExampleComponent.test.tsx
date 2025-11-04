import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { ExampleComponent } from './ExampleComponent';

describe('ExampleComponent', () => {
  it('should render', async () => {
    await renderInTestApp(<ExampleComponent />);
    expect(
      screen.getByText('Welcome to Conviso Platform Integration'),
    ).toBeInTheDocument();
  });
});
