#!/bin/bash

# n8n-nodes-sinch NPM Deployment Script
# This script publishes the package to NPM using your personal access token

set -e

echo "🚀 n8n-nodes-sinch NPM Deployment"
echo "=================================="

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found. Run from project root."
    exit 1
fi

# Validate package name against expected development or production variants
PACKAGE_NAME=$(grep -m1 '"name"' package.json | cut -d'"' -f4)
EXPECTED_DEV_NAME="n8n-nodes-sinch-dev"
EXPECTED_ALT_DEV_NAME="n8n-nodes-sinch-build-dev" # legacy name
EXPECTED_PROD_NAME="@sinch-engage/n8n-nodes-sinch"
EXPECTED_SINCH_NAME="@sinch/n8n-nodes-sinch"

if [[ "$PACKAGE_NAME" != "$EXPECTED_DEV_NAME" && "$PACKAGE_NAME" != "$EXPECTED_ALT_DEV_NAME" && "$PACKAGE_NAME" != "$EXPECTED_PROD_NAME" && "$PACKAGE_NAME" != "$EXPECTED_SINCH_NAME" ]]; then
    echo "❌ Error: Unexpected package name '$PACKAGE_NAME'." >&2
    echo "   Acceptable names: $EXPECTED_DEV_NAME | $EXPECTED_ALT_DEV_NAME | $EXPECTED_PROD_NAME | $EXPECTED_SINCH_NAME" >&2
    echo "   Update package.json 'name' or adjust script expectations before deploying." >&2
    exit 1
fi

# Function to auto-bump version
bump_version() {
    CURRENT_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
    NPM_VERSION=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "")

    # Use the higher of the two as the base
    if [[ -n "$NPM_VERSION" && "$NPM_VERSION" != "$CURRENT_VERSION" ]]; then
        echo "⚠️  npm version ($NPM_VERSION) differs from package.json ($CURRENT_VERSION). Using npm version as base."
        BASE_VERSION="$NPM_VERSION"
    else
        BASE_VERSION="$CURRENT_VERSION"
    fi

    # Increment the trailing numeric component (e.g. 1.0.0-alpha-0.3 -> 1.0.0-alpha-0.4)
    VERSION_PREFIX="${BASE_VERSION%.*}"
    VERSION_PATCH="${BASE_VERSION##*.}"
    NEW_VERSION="${VERSION_PREFIX}.$((VERSION_PATCH + 1))"

    echo ""
    echo "🔢 Version bump: $BASE_VERSION -> $NEW_VERSION"

    # Write new version to package.json
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    PACKAGE_VERSION="$NEW_VERSION"
}

# Check if package is built
if [[ ! -d "dist" ]]; then
    echo "📦 Building package..."
    npm run build
fi

# Function to prompt for NPM token
get_npm_token() {
    # If already logged in (npm whoami succeeds), skip token prompt
    if npm whoami >/dev/null 2>&1; then
        echo "🔐 Using existing npm authentication: $(npm whoami)"
        return 0
    fi
    if [[ -z "$NPM_TOKEN" ]]; then
        echo ""
        echo "🔑 NPM Authentication Required"
        echo "------------------------------"
        echo "You need an NPM access token with publish permissions."
        echo "Get your token from: https://www.npmjs.com/settings/tokens"
        echo ""
        read -p "Enter your NPM access token: " NPM_TOKEN

        if [[ -z "$NPM_TOKEN" ]]; then
            echo "❌ Error: NPM token is required"
            exit 1
        fi
    fi
}

# Function to configure NPM
setup_npm() {
    echo ""
    echo "🔧 Configuring NPM..."
    # Only set auth token if not already logged-in
    if ! npm whoami >/dev/null 2>&1; then
        echo "Setting NPM token..."
        npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
    else
        echo "Already authenticated as $(npm whoami). Skipping token config."
    fi

    # Verify NPM is configured
    echo "Verifying NPM configuration..."
    npm whoami
}

# Function to publish package
publish_package() {
    echo ""
    echo "📤 Publishing to NPM..."
    echo "Package: $(grep -m1 '"name"' package.json | cut -d'"' -f4)"
    echo "Version: $(grep '"version"' package.json | cut -d'"' -f4)"
    echo "Registry: https://registry.npmjs.org/"
    echo ""

    # Confirm before publishing
    read -p "Ready to publish? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Publishing cancelled"
        exit 0
    fi

    # Publish with alpha tag first
    npm publish --tag alpha --access public

    if [[ $? -eq 0 ]]; then
        echo ""
        echo "✅ Successfully published as alpha!"
        echo ""
        PACKAGE_NAME=$(grep -m1 '"name"' package.json | cut -d'"' -f4)
        PACKAGE_VERSION=$(grep -m1 '"version"' package.json | cut -d'"' -f4)
        echo "📦 Package Details:"
        echo "   Name: $PACKAGE_NAME"
        echo "   Version: $PACKAGE_VERSION"
        echo "   NPM URL: https://www.npmjs.com/package/$PACKAGE_NAME"
        echo ""
        echo "🔗 Alpha installation:"
        echo "   npm install $PACKAGE_NAME@alpha"
        echo ""

        # Prompt to also tag as latest
        read -p "Also tag this version as 'latest'? (y/N): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" latest
            echo ""
            echo "✅ Also tagged as latest!"
            echo "   npm install $PACKAGE_NAME@latest"
        else
            echo "Skipped latest tag. Run manually if needed:"
            echo "   npm dist-tag add $PACKAGE_NAME@$PACKAGE_VERSION latest"
        fi
    else
        echo ""
        echo "❌ Publishing failed!"
        echo "Check the error messages above and try again."
        exit 1
    fi
}

# Main execution
PACKAGE_NAME=$(grep -m1 '"name"' package.json | cut -d'"' -f4)
PACKAGE_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
echo "Current package info:"
echo "  Name: $PACKAGE_NAME"
echo "  Version: $PACKAGE_VERSION"

bump_version

get_npm_token
setup_npm
publish_package

echo ""
echo "🎉 Deployment complete!"
