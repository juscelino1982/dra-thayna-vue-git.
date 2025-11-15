#!/bin/bash
set -e

echo "🔧 Starting custom build process..."

# Check npm version
NPM_VERSION=$(npm --version | cut -d. -f1)
echo "📦 Current npm version: $(npm --version)"

# If npm v10, downgrade to v9
if [ "$NPM_VERSION" -ge "10" ]; then
  echo "⚠️  Detected npm v10+ (has known bugs)"
  echo "⬇️  Downgrading to npm@9..."
  npm install -g npm@9
  echo "✅ npm downgraded to: $(npm --version)"
fi

# Clean install
echo "🧹 Cleaning node_modules..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies with npm@9..."
npm install --legacy-peer-deps

echo "🔨 Building project..."
npm run build

echo "✅ Build completed successfully!"
