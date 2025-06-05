
# Contributing to CodeTide VS Code Extension

Thank you for your interest in contributing! This guide will help you set up the project for development and outline our contribution process.

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Python 3.8+](https://www.python.org/downloads/)
- [VS Code](https://code.visualstudio.com/)

### Install Dependencies
1. Clone the repository.
2. Install Node.js dependencies:
   ```
   npm install
   ```
3. Set up the Python backend:
   ```
   cd python
   pip install -r requirements.txt
   ```

## Running the Extension

1. Open the project folder in VS Code.
2. Press `F5` to launch a new Extension Development Host window.
3. Use the Command Palette to run CodeTide commands.

## Contribution Guidelines

- Fork the repository and create a feature branch.
- Make your changes in small, focused commits.
- Ensure your code passes linting:
  ```
  npm run lint
  ```
- Add or update tests as appropriate:
  ```
  npm test
  ```
- Open a pull request with a clear description of your changes.

## Formatting & Testing Standards

- Use ESLint for TypeScript code formatting (`npm run lint`).
- Write tests using Mocha (see `src/test/extension.test.ts`).
- Follow existing code style and naming conventions.

## Questions or Issues?

Open an issue on the [GitHub Issues page](https://github.com/BrunoV21/codetide-vsExtension/issues).

---

Thank you for helping improve CodeTide!