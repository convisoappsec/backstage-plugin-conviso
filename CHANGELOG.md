# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-11-12

### Fixed
- Fixed backend import path to avoid circular dependency by importing directly from `module.ts`
- Updated README to show correct import syntax with `.js` extension for ES modules

## [0.1.1] - 2025-11-12

### Fixed
- Simplified backend plugin installation by removing unsupported `exports` field from `package.json`
- Added `backend.js` and `backend.d.ts` entry points in package root for easier imports
- Fixed TypeScript type errors in `entityMapper`, `convisoConfig`, and `integrationRoutes`
- Added automatic type generation script (`ensure-backend-types.js`) for backend types

### Changed
- Backend plugin now uses TypeScript source files directly (included in package)
- Improved README with clearer installation instructions

## [0.1.0] - 2025-11-12

### Added
- Initial release of Conviso Platform Backstage Plugin
- Project import functionality: Import Backstage catalog entities as assets in Conviso Platform
- Auto-import feature: Automatically sync new entities from Backstage catalog
- Integration management: Create and configure Conviso Platform integrations
- Asset status tracking: View which projects are imported and their status
- Search and filter: Search projects by name, description, or owner
- Pagination support: Handle large catalogs with efficient pagination
- Caching system: Multi-layer caching for improved performance
- Backend API routes: RESTful API for plugin operations
- Comprehensive test coverage: Unit tests for frontend and backend components

### Features
- **Project Selection**: Select and import multiple projects from Backstage catalog
- **Auto-Import**: Enable automatic synchronization of new entities
- **Status Refresh**: Manually refresh import status of assets
- **Table View**: Display projects with sorting, filtering, and pagination
- **Integration Configuration**: Set up Conviso Platform API credentials
- **Error Handling**: Comprehensive error handling and user feedback

### Technical
- Built with React and TypeScript
- Backend plugin with Express routes
- GraphQL integration with Conviso Platform API
- Kafka-based asynchronous processing
- File-based caching system
- Full test coverage with Jest and React Testing Library

[0.1.2]: https://github.com/convisoappsec/backstage-plugin-conviso/releases/tag/v0.1.2
[0.1.1]: https://github.com/convisoappsec/backstage-plugin-conviso/releases/tag/v0.1.1
[0.1.0]: https://github.com/convisoappsec/backstage-plugin-conviso/releases/tag/v0.1.0

