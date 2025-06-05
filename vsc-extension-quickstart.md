
# CodeTide VS Code Extension – Developer Quickstart

This guide is for internal developers working on the CodeTide VS Code extension.

## 1. Prerequisites
- Node.js (v16+ recommended)
- npm
- Python 3.8+
- VS Code

## 2. Project Setup
```sh
# Clone the repository
git clone <repo-url>
cd codetide-vsExtension

# Install Node.js dependencies
npm install

# Set up Python backend
cd python
pip install -r requirements.txt
cd ..
```

## 3. Building the Extension
```sh
# Build TypeScript and bundle with Webpack
npm run compile
```

## 4. Running & Debugging in VS Code
1. Open the project folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. Use the Command Palette to run CodeTide commands.
4. Set breakpoints in `src/extension.ts` or other files to debug.

## 5. Testing
```sh
# Lint code
npm run lint

# Run tests (Mocha)
npm test
```
Tests are in `src/test/extension.test.ts`.

## 6. Packaging & Publishing
```sh
# Bundle for production
npm run package

# (Optional) Publish to Marketplace
# See: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
```

## 7. Troubleshooting
- **Python errors:** Ensure Python 3.8+ is installed and available in PATH.
- **Backend issues:** Check `python/requirements.txt` and install dependencies.
- **Cached IDs not found:** Run "CodeTide: Initialize Project" to generate `storage/cached_ids.json`.
- **Extension not activating:** Check the VS Code Output panel for errors.

## 8. Useful Tips
- Use `npm run watch` for automatic rebuilds during development.
- Use "CodeTide: Refresh Cached IDs" to reload snippet IDs after parsing.
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

For more help, open an issue or see the main [README.md](./README.md).