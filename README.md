# Conviso Platform Backstage Plugin

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@conviso/backstage-plugin-conviso)](https://www.npmjs.com/package/@conviso/backstage-plugin-conviso)

Backstage plugin for integration with [Conviso Platform](https://convisoappsec.com/). Import your Backstage catalog entities as assets in Conviso Platform.

## Features

- 🔄 **Project Import**: Import Backstage catalog projects as assets in Conviso Platform
- 🤖 **Auto-Import**: Automatically sync new entities from your Backstage catalog
- 📊 **Status Tracking**: View which projects are imported and their status
- 🔍 **Search & Filter**: Search projects by name, description, or owner
- ⚡ **Performance**: Multi-layer caching system for fast operations
- 🔐 **Security**: Secure API key authentication with Conviso Platform
- 📈 **Scalable**: Handles large catalogs with efficient pagination and batch processing

## Installation

Install the plugin package in your Backstage app:

```bash
yarn add @conviso/backstage-plugin-conviso
```

Or with npm:

```bash
npm install @conviso/backstage-plugin-conviso
```

## Setup

### 1. Add the Frontend Plugin

**1.1. Add the route** (`packages/app/src/App.tsx`):

```tsx
import { BackstagePluginConvisoPage } from '@conviso/backstage-plugin-conviso';

// In your routes
<Route path="/conviso" element={<BackstagePluginConvisoPage />} />
```

**1.2. Add sidebar navigation link** (`packages/app/src/components/Root/Root.tsx`):

```tsx
import { SidebarItem } from '@backstage/core-components';
import SecurityIcon from '@material-ui/icons/Security';

// Inside the SidebarGroup "Menu", add:
<SidebarItem icon={SecurityIcon} to="conviso" text="Conviso" />
```

This adds a "Conviso" link to the sidebar menu.

### 2. Add the Backend Plugin

In your `packages/backend/src/index.ts`, add the backend plugin:

```ts
// Conviso plugin backend
backend.add(import('@conviso/backstage-plugin-conviso/backend.js'));
```

**Note:** The plugin follows the official Backstage plugin pattern, compiling the backend to CommonJS and exporting via the `exports` field in `package.json`.

### 3. Configure the Plugin

The plugin supports two configuration methods. Choose the one that best fits your setup:

#### Method 1: Using app-config.yaml (Recommended)

Add the Conviso configuration to your `app-config.yaml`:

```yaml
# Conviso Platform configuration
conviso:
  apiKey: ${CONVISO_API_KEY}
  companyId: ${CONVISO_COMPANY_ID}
  environment: ${CONVISO_ENVIRONMENT:-production}
  apiBase: ${CONVISO_API_BASE}  # Required if environment is 'local'
```

**Important:** Always use environment variable substitution (`${VAR}`) in `app-config.yaml` to avoid committing sensitive values to Git. Never hardcode API keys or company IDs directly in the config file.

Then set the environment variables using one of the following options:

**Option A: Using a `.env` file (requires dotenv-cli)**

1. Create a `.env` file in your Backstage root directory:

```bash
# .env
CONVISO_API_KEY=your-api-key
CONVISO_COMPANY_ID=your-company-id
CONVISO_ENVIRONMENT=production  # or "staging" or "local"
CONVISO_API_BASE=http://localhost:3000  # Only if environment is 'local'
```

2. Install `dotenv-cli`:

```bash
yarn add -D dotenv-cli
```

3. Update your start script in `package.json`:

```json
{
  "scripts": {
    "start": "dotenv -e .env -- backstage-cli repo start"
  }
}
```

**Option B: Export environment variables directly**

Export the variables in your shell before starting Backstage:

```bash
export CONVISO_API_KEY="your-api-key"
export CONVISO_COMPANY_ID="your-company-id"
export CONVISO_ENVIRONMENT="production"  # or "staging" or "local"
export CONVISO_API_BASE="http://localhost:3000"  # Only if environment is 'local'
```

**Note:** Backstage does not automatically load `.env` files. You must either use `dotenv-cli` or export the variables in your shell environment.

#### Method 2: Using Environment Variables Only

If you prefer not to use `app-config.yaml`, the plugin reads directly from environment variables:

```bash
export CONVISO_API_KEY="your-api-key"
export CONVISO_COMPANY_ID="your-company-id"
export CONVISO_ENVIRONMENT="production"  # or "staging" or "local"
export CONVISO_API_BASE="http://localhost:3000"  # Only if environment is 'local'
```

**Note:** The plugin reads configuration from `app-config.yaml` first (if configured), then falls back to environment variables for compatibility.

## Quick Start

After installation and configuration:

1. Start your Backstage instance: `yarn dev` (or `yarn start`)
2. Navigate to `http://localhost:3000/conviso` in your browser
3. Start importing your Backstage catalog entities!

## Usage

### Importing Projects

1. Navigate to the Conviso plugin page in Backstage (`/conviso`)
2. Browse your catalog entities in the table
3. Select one or more projects you want to import (use checkboxes)
4. Click "Import Selected" to sync them to Conviso Platform
5. Wait for the import to complete (you'll see a success message)

### Auto-Import

Enable auto-import to automatically sync new entities from your Backstage catalog:

1. Toggle "Auto Import" in the plugin interface
2. New entities will be automatically imported when detected
3. The system runs periodic checks to sync new projects

### Refreshing Status

Use the "Refresh Status" button to update the import status of all assets, ensuring the plugin reflects the current state in Conviso Platform.

## API Endpoints

The backend plugin provides the following REST API endpoints:

- `GET /api/conviso/imported-assets/:companyId?` - Get list of imported assets
- `POST /api/conviso/import-projects` - Import projects to Conviso Platform
- `POST /api/conviso/check-imported-names` - Check which names are already imported
- `POST /api/conviso/sync-imported-assets/:companyId?` - Sync asset cache
- `GET /api/conviso/integration/:instanceId` - Get integration details
- `POST /api/conviso/integration` - Create or update integration
- `POST /api/conviso/auto-import` - Configure auto-import settings

## Configuration Reference

### Environment Variables

**Required:**
- `CONVISO_API_KEY` - Your Conviso Platform API key

**Optional:**
- `CONVISO_COMPANY_ID` - Default company ID (can also be provided per integration)
- `CONVISO_ENVIRONMENT` - Environment: `"production"` (default), `"staging"`, or `"local"`
- `CONVISO_API_BASE` - Custom API base URL (required if `CONVISO_ENVIRONMENT=local`)
- `CONVISO_CACHE_DIR` - Custom cache directory path

### app-config.yaml Structure

```yaml
conviso:
  apiKey: ${CONVISO_API_KEY}
  companyId: ${CONVISO_COMPANY_ID}
  environment: ${CONVISO_ENVIRONMENT:-production}
  apiBase: ${CONVISO_API_BASE}  # Required if environment is 'local'
```

### Frontend Configuration

The frontend plugin reads configuration from:
- `localStorage`: Stores `companyId` and `instanceId` per instance
- Backend API: Fetches integration settings from the backend

## Development

### Running the Plugin Locally

```bash
yarn start
```

The plugin will be available at `http://localhost:3000/conviso`.

### Building

```bash
yarn build
```

### Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

## Architecture

### Frontend

- React components with Material-UI
- Custom hooks for state management
- Caching layer for performance optimization
- Real-time status updates

### Backend

- Express.js REST API
- GraphQL client for Conviso Platform
- Kafka integration for async processing
- File-based caching system
- Background jobs for auto-import

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright 2025 Conviso Application Security

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Support

- **Documentation**: [GitHub Repository](https://github.com/convisoappsec/backstage-plugin-conviso)
- **Issues**: [GitHub Issues](https://github.com/convisoappsec/backstage-plugin-conviso/issues)
- **Conviso Platform**: [https://convisoappsec.com/](https://convisoappsec.com/)

## Related Links

- [Backstage Documentation](https://backstage.io/docs)
- [Conviso Platform](https://convisoappsec.com/)
- [Backstage Plugin Directory](https://backstage.io/plugins/)
