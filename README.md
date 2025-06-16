
# CodeTide VS Code Extension

**CodeTide** is an intelligent code context manager that helps developers extract, organize, and retrieve the perfect code snippets for LLM-assisted workflows in Visual Studio Code. It automatically parses and indexes your entire codebase, providing flexible context generation for GitHub Copilot and other AI coding assistants.

![CodeTide in Action](https://github.com/BrunoV21/codetide-vsExtension/raw/main/assets/codetide-demo.gif)

*(Example GIF showing context selection and Copilot integration)*

## Key Features

- **Automatic Codebase Parsing** - Intelligently indexes your entire project structure
- **Flexible Context Generation** - Multiple output formats (shallow, deep, tree views)
- **Seamless Copilot Integration** - Directly add relevant context to your Copilot prompts
- **Fuzzy Search** - Quickly find code snippets with intelligent autocomplete
- **Clipboard Support** - Copy context to clipboard for use anywhere
- **Python Backend** - Advanced code analysis powered by custom Python processing

## Installation

### Prerequisites
- [Python 3.8+](https://www.python.org/downloads/) installed and in your PATH
- [VS Code](https://code.visualstudio.com/) 1.100.0 or later

### Steps
1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=BrunoV21.codetide)
2. Open a project in VS Code
3. On first run, the extension will automatically:
   - Set up a Python virtual environment
   - Install required dependencies (including `codetide` backend)
   
*Manual installation option:*
```bash
pip install git+https://github.com/BrunoV21/codetide
```

## Usage

### Core Workflow
1. **Initialize** your project with `CodeTide: Initialize Project`
2. **Select** code context using the fuzzy search interface
3. **Retrieve** in your preferred format (Copilot, clipboard, etc.)

### Command Reference

#### Project Management
| Command | Description |
|---------|-------------|
| `CodeTide: Initialize Project` | Parse workspace and extract code context |
| `CodeTide: Refresh the project` | Update cached IDs and context |

#### Context Retrieval
| Command | Output Target | Context Depth |
|---------|---------------|---------------|
| `CodeTide: Get by IDs (Add to Copilot)` | Copilot Context | Standard |
| `CodeTide: Get by IDs (Copy to Clipboard)` | Clipboard | Standard |
| `CodeTide: Get by IDs - Shallow` | Copilot Context | Minimal |
| `CodeTide: Get by IDs - Deep` | Copilot Context | Extended |

#### Tree Views
| Command | Includes |
|---------|----------|
| `CodeTide: Get Tree View` | Basic structure |
| `CodeTide: Get Tree View - with Modules` | + Module dependencies |
| `CodeTide: Get Tree View - with Modules & Types` | + Type annotations |

#### Python Environment
| Command | Description |
|---------|-------------|
| `CodeTide: Reinstall Python Environment` | Clean reinstall of dependencies |
| `CodeTide: Update Python Dependencies` | Update to latest versions |
| `CodeTide: Check Python Environment Status` | Verify installation status |

## First Run Guide
1. Open your project in VS Code
2. Run `CodeTide: Initialize Project` to parse your codebase
3. Use the context retrieval commands as needed
4. For Copilot integration, select snippets and choose "Add to Copilot"

## Technical Requirements
- **Backend**: Requires [codetide Python package](https://github.com/BrunoV21/codetide)
- **System**: Python 3.8+ must be installed and accessible
- **Permissions**: Needs read access to your project files

## Troubleshooting
- **Python not found**: Ensure Python is in your PATH or reinstall it
- **Missing dependencies**: Run `CodeTide: Reinstall Python Environment`
- **Cached IDs not updating**: Use `CodeTide: Refresh the project`

## Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License
Apache 2.0 - See [LICENSE](LICENSE) for details.