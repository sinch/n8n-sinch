# Deployment Guide: n8n-nodes-sinch-build-conversations

This guide explains how to deploy the n8n Sinch Build Conversations connector using a two-phase approach:
1. **Development Phase**: Deploy to personal account with unique name for testing
2. **Production Phase**: Deploy to Sinch Engage organization with final name

## Overview

The deployment process uses a two-phase approach:

### Phase 1: Development (Personal Account)
- Deploy to personal NPM account with unique development name
- Test and iterate freely without organization constraints
- Unpublish development versions when ready for production

### Phase 2: Production (Organization)
- Deploy to `@sinch-engage` organization with final name
- Use stable version numbers (no alpha)
- Permanent deployment for production use

### Available Scripts
- `deploy/deploy-to-npm.sh` - Publishes current package (development or production)
- `deploy/unpublish-dev-package.sh` - Safely unpublishes development versions

## Prerequisites

### 1. NPM Account & Access Token
You need an NPM account with publish permissions:

1. **Create NPM Account**: https://www.npmjs.com/signup
2. **Generate Access Token**:
   - Go to: https://www.npmjs.com/settings/tokens
   - Click **"Generate New Token"**
   - Select **"Automation"** or **"Publish"** scope
   - Copy the generated token (⚠️ **save it securely** - you won't see it again!)

### 2. Local Environment
- Node.js (v18+ recommended)
- NPM CLI
- Git repository access

## Two-Phase Deployment Process

### Phase 1: Development Deployment

**Current Status**: Ready for development deployment with unique package name

```bash
# Navigate to project root
cd /path/to/connectors/n8n/n8n-build/n8n-nodes-sinch-build-conversations

# Deploy to personal account for testing
./deploy/deploy-to-npm.sh
```

**Current Package Configuration:**
- Name: `@sinch-engage/n8n-nodes-sinch-build-conversations`
- Version: `1.0.0-alpha-0`
- Scope: Sinch Engage organization

**What happens:**
1. 🔍 Verifies package name and version
2. 🔨 Builds the package if needed
3. 🔑 Prompts for NPM access token
4. 📤 Publishes to `@sinch-engage/n8n-nodes-sinch-build-conversations@alpha`
5. ✅ Provides testing instructions

### Phase 2: Production Deployment

**When ready for production:**

```bash
# 1. Update package.json version to "1.0.0" (remove alpha)

# 2. Deploy to organization
./deploy/deploy-to-npm.sh
```

**Production Package Configuration:**
- Name: `@sinch-engage/n8n-nodes-sinch-build-conversations` (organization scope)
- Version: `1.0.0` (stable release)
- Scope: Sinch Engage organization

### Manual Development Deployment

For development phase:

```bash
# 1. Build the package
npm run build

# 2. Login to NPM (if not already logged in)
npm login

# 3. Publish development version
npm publish --tag alpha
```

### Manual Production Deployment

For production phase:

```bash
# 1. Update package.json version to "1.0.0" (remove alpha)
# 2. Build and test locally
npm run build && npm test

# 3. Publish to organization
npm publish --tag latest
```

## Deployment Script Details

The `deploy/deploy-to-npm.sh` script provides:

### Features
- **Safety Checks**: Verifies correct directory and package name
- **Auto-build**: Builds package if `dist/` directory doesn't exist
- **Interactive Prompts**: Asks for NPM token securely
- **Confirmation**: Asks before publishing
- **Error Handling**: Clear error messages and exit codes
- **Success Feedback**: Shows package details and next steps

### Security Notes
- NPM token is entered interactively (not logged)
- Token is configured temporarily for this session
- No tokens are stored in files

## Post-Deployment Steps

### 1. Verify Publication

```bash
# Check if package is published
npm view @sinch-engage/n8n-nodes-sinch-build-conversations versions --json

# View package info
npm view @sinch-engage/n8n-nodes-sinch-build-conversations
```

### 2. Test Installation

```bash
# Install the alpha version for testing
npm install @sinch-engage/n8n-nodes-sinch-build-conversations@alpha

# Or install in n8n for testing
# In n8n: Settings → Community Nodes → Install
# Enter: @sinch-engage/n8n-nodes-sinch-build-conversations
```

### 3. Test in n8n

1. **Install in n8n**: Use the Community Nodes interface
2. **Configure Credentials**: Add Sinch Build Conversations API credentials
3. **Test Workflow**: Create a simple SMS workflow
4. **Verify Functionality**: Test with real credentials

## Troubleshooting

### Common Issues

**❌ "Publishing failed"**
- Check NPM token permissions
- Verify package builds successfully (`npm run build`)
- Ensure no existing package with same version

**❌ "npm whoami failed"**
- Check NPM token validity
- Re-run script to re-enter token

**❌ "Package not found after publishing"**
- Wait a few minutes for NPM propagation
- Check correct package name spelling
- Verify alpha tag: `npm view @sinch-engage/n8n-nodes-sinch-build-conversations dist-tags`

### Getting Help
- Check NPM status: https://status.npmjs.org/
- NPM support: https://www.npmjs.com/support
- Package: https://www.npmjs.com/package/@sinch-engage/n8n-nodes-sinch-build-conversations

## Version Management

### Version Commands

```bash
# Development iterations (alpha releases)
npm version prerelease --preid=alpha  # 1.0.0-alpha-0, 1.0.0-alpha-1, etc.

# For production release
npm version patch  # 1.0.0 (removes pre-release)

# Check current version
npm version
```

### Version Strategy

- **Alpha**: `1.0.0-alpha-0`, `1.0.0-alpha-1`, etc. (development)
- **Beta**: `1.0.0-beta-0`, `1.0.0-beta-1`, etc. (pre-production)
- **GA**: `1.0.0`, `1.1.0`, etc. (stable releases)

### Unpublishing Versions

⚠️ **Note**: NPM allows unpublishing only within 72 hours of publishing

```bash
# Check if unpublishing is possible
npm view @sinch-engage/n8n-nodes-sinch-build-conversations

# Unpublish specific version (within 72 hours)
npm unpublish @sinch-engage/n8n-nodes-sinch-build-conversations@1.0.0-alpha-0
```

## Security Considerations

### NPM Access Tokens
- ✅ Use **Automation** or **Publish** scope tokens
- ✅ Set token expiration if possible
- ✅ Store tokens securely (password manager)
- ❌ Don't commit tokens to Git
- ❌ Don't use account password for automation

### Package Security
- Package is marked as `1.0.0-alpha-0` (pre-release)
- Alpha tag clearly indicates testing/development use
- Update CHANGELOG.md with each release
- Follow semantic versioning for stability

## CI/CD Notes

This deployment process is designed for **local deployment** because:
- NPM tokens are personal and shouldn't be in CI
- Alpha releases need human oversight
- Testing should happen before publishing

For future GA releases, consider:
- Automated testing in CI
- Separate NPM tokens for CI
- Automated publishing for stable releases

## Support

For issues or questions:
1. Check this deployment guide
2. Review the main README.md
3. Check CHANGELOG.md for known issues
4. Create an issue in the repository

---

**Current Status**: `@sinch-engage/n8n-nodes-sinch-build-conversations@1.0.0-alpha-0` - Ready for development testing

**Next Phase**: Production deployment to `@sinch-engage/n8n-nodes-sinch-build-conversations@1.0.0`


