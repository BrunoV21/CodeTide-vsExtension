
# CodeTide VS Code Extension

**CodeTide** helps you extract, manage, and retrieve just the right code context for your favorite LLMs and Copilot workflows in Visual Studio Code.

## Features

- Parse your project and extract code snippets with unique IDs
- Fuzzy autocomplete for snippet ID selection
- Retrieve code snippets by ID (with deep context support)
- Add selected snippets to Copilot/LLM context
- Refresh cached IDs for up-to-date autocomplete
- Python backend integration for advanced code analysis

## Installation

1. Install [Python 3.8+](https://www.python.org/downloads/) and ensure it is in your PATH.
2. Install the extension from the VS Code Marketplace or via `.vsix` package.
3. On first use, required Python dependencies (including `codetide`) will be installed automatically. Alternatively, run:
   ```
   pip install git+https://github.com/BrunoV21/codetide
   ```

## Usage

Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for:

- **CodeTide: Initialize Project** – Parse your workspace and extract code context.
- **CodeTide: Get by IDs** – Retrieve code snippets by their IDs (with autocomplete).
- **CodeTide: Add IDs to Copilot Context** – Add selected snippets to your Copilot/LLM context.
- **CodeTide: Refresh Cached IDs** – Update the list of available snippet IDs.