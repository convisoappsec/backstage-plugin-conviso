# Conviso Platform Backstage Plugin

Backstage plugin that enables seamless integration with Conviso Platform. Sync catalog entities as security assets, manage environments, and view security insights without leaving Backstage.

## Features

- 🔄 **Project Sync**: Import Backstage catalog projects as assets in Conviso Platform
- 🌍 **Environment Support**: Configure production and staging environments
- 🔐 **Security Dashboard**: View security metrics and vulnerabilities directly in Backstage
- ⚙️ **Easy Configuration**: Simple setup with API key authentication

## Getting Started

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn start` in the root directory, and then navigating to [/backstage-plugin-conviso](http://localhost:3000/backstage-plugin-conviso).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.

This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.

It is only meant for local development, and the setup for it can be found inside the [/dev](./dev) directory.

## Installation

```bash
npm install @conviso/backstage-platform-integration
```

## Configuration

1. Add the plugin to your Backstage app
2. Configure your Conviso Platform API key
3. Select environment (production/staging)
4. Start syncing projects!

## Usage

- **Configure**: Set up your API key and environment
- **Sync**: Import projects from Backstage catalog to Conviso Platform
- **Monitor**: View security insights and metrics in Backstage

## License

Apache License 2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.