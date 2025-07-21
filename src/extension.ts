import { FuzzyAutocomplete } from './fuzzyAutoComplete';
import { RunPythonCommand } from './runPythonCommand';
// import { PythonEnvironmentManager } from './pythonEnvironmentManager';
import { UVManager } from './uvManager';
import * as vscode from 'vscode';

// let pythonEnvManager: PythonEnvironmentManager;
let uvManager: UVManager;

export async function activate(context: vscode.ExtensionContext) {
    try {
        uvManager = new UVManager(context);
        
        // Ensure UVX is available
        vscode.window.showInformationMessage('CodeTide: Checking UV installation...');
        const uvxPath = await uvManager.ensureUVX();
        
        if (uvxPath) {
            vscode.window.showInformationMessage(`CodeTide: UV is ready at ${uvxPath}`);
        } else {
            vscode.window.showWarningMessage('CodeTide: UV is not available. Some features may not work.');
        }
        
        // Initialize the main extension functionality
        initializeExtension(context);
        // Register UV-related commands
        registerUVCommands(context);
        
        // Show success message
        vscode.window.showInformationMessage('CodeTide Extension activated successfully!');
        
    } catch (error) {
        vscode.window.showErrorMessage(`CodeTide Extension failed to initialize: ${error}`);
        registerUVCommands(context);        
        return;
    }
}

function registerUVCommands(context: vscode.ExtensionContext) {
    // Command to check UV status
    context.subscriptions.push(vscode.commands.registerCommand('codetide.checkUVStatus', async () => {
        if (!uvManager) {
            vscode.window.showErrorMessage('UV Manager not initialized');
            return;
        }

        const uvxPath = await uvManager.findUVX();
        const uvPath = await uvManager.getUVPath();
        const config = uvManager.getConfig();
        
        const statusMessage = `UV Status:
UVX: ${uvxPath || 'Not found'}
UV: ${uvPath || 'Not found'}
Custom Path: ${config.customInstallPath || 'None'}`;
        
        vscode.window.showInformationMessage(statusMessage);
    }));

    // Command to reinstall/setup UV
    context.subscriptions.push(vscode.commands.registerCommand('codetide.setupUV', async () => {
        if (!uvManager) {
            vscode.window.showErrorMessage('UV Manager not initialized');
            return;
        }

        try {
            vscode.window.showInformationMessage('Setting up UV...');
            const uvxPath = await uvManager.ensureUVX();
            
            if (uvxPath) {
                vscode.window.showInformationMessage(`UV setup successful! Located at: ${uvxPath}`);
            } else {
                vscode.window.showWarningMessage('UV setup completed but UVX path not found.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`UV setup failed: ${error}`);
        }
    }));

    // Command to reset UV configuration
    context.subscriptions.push(vscode.commands.registerCommand('codetide.resetUVConfig', async () => {
        if (!uvManager) {
            vscode.window.showErrorMessage('UV Manager not initialized');
            return;
        }

        const result = await vscode.window.showWarningMessage(
            'This will reset all UV configuration. Continue?',
            { modal: true },
            'Yes',
            'No'
        );

        if (result === 'Yes') {
            uvManager.resetConfig();
            vscode.window.showInformationMessage('UV configuration reset successfully.');
        }
    }));

    // Command to run UV commands directly
    context.subscriptions.push(vscode.commands.registerCommand('codetide.runUVCommand', async () => {
        if (!uvManager) {
            vscode.window.showErrorMessage('UV Manager not initialized');
            return;
        }

        const uvxPath = await uvManager.findUVX();
        if (!uvxPath) {
            vscode.window.showErrorMessage('UVX not found. Please run "CodeTide: Setup UV" first.');
            return;
        }

        const command = await vscode.window.showInputBox({
            prompt: 'Enter UV command (e.g., "run python --version")',
            placeHolder: 'run python --version'
        });

        if (command) {
            const workspacePath = getWorkspacePath();
            if (!workspacePath) return;

            // You can modify RunPythonCommand to accept uvx path, or create a new function
            // For now, showing how you might integrate it:
            vscode.window.showInformationMessage(`Running: uvx ${command}`);
            // Implementation depends on how you want to execute uvx commands
        }
    }));
}

// Helper function to get UVX path for use in other parts of your extension
export async function getUVXPath(): Promise<string | null> {
    if (!uvManager) {
        return null;
    }
    return await uvManager.findUVX();
}

// Helper function to get UV path for use in other parts of your extension
export async function getUVPath(): Promise<string | null> {
    if (!uvManager) {
        return null;
    }
    return await uvManager.getUVPath();
}

function initializeExtension(context: vscode.ExtensionContext) {
    const fuzzyAutocomplete = new FuzzyAutocomplete();

    // Helper function to get workspace path with error handling
    const getWorkspacePath = (): string | null => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return null;
        }
        return workspacePath;
    };

    // Modified project parser command to potentially use UV
    context.subscriptions.push(vscode.commands.registerCommand('extension.runParser', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;
        
        RunPythonCommand('project', [workspacePath], 'CodeTide: Initialize Project');
    }));

    // ============== Document-Opening Commands ==============

    // Get by IDs (Open Document)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIds', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds], 'CodeTide: Getting Code Snippets...', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                
                // Add the document to Copilot context
                if (await vscode.commands.getCommands().then(commands => commands.includes('github.copilot.addContext'))) {
                    await vscode.commands.executeCommand('github.copilot.addContext', editor.document.uri);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs Shallow (Open Document)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsShallow', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '0'], 'CodeTide: Get by IDs (Shallow)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                
                // Add the document to Copilot context
                if (await vscode.commands.getCommands().then(commands => commands.includes('github.copilot.addContext'))) {
                    await vscode.commands.executeCommand('github.copilot.addContext', editor.document.uri);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs Deep (Open Document)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsDeep', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Get by IDs (Deep)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                
                // Add the document to Copilot context
                if (await vscode.commands.getCommands().then(commands => commands.includes('github.copilot.addContext'))) {
                    await vscode.commands.executeCommand('github.copilot.addContext', editor.document.uri);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Tree View commands (Open Document)
    const registerTreeViewCommand = (commandName: string, args: string[], title: string) => {
        context.subscriptions.push(vscode.commands.registerCommand(commandName, async () => {
            const workspacePath = getWorkspacePath();
            if (!workspacePath) return;

            try {
                RunPythonCommand('tree', [workspacePath, ...args], title, async (output) => {
                    const doc = await vscode.workspace.openTextDocument({
                        content: output,
                        language: 'plaintext'
                    });
                    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                
                    // Add the document to Copilot context
                    if (await vscode.commands.getCommands().then(commands => commands.includes('github.copilot.addContext'))) {
                        await vscode.commands.executeCommand('github.copilot.addContext', editor.document.uri);
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating tree view: ${error}`);
            }
        }));
    };

    registerTreeViewCommand('extension.getTreeView', [], 'CodeTide: Generating Tree View...');
    registerTreeViewCommand('extension.getTreeViewModules', ['--include-modules'], 'CodeTide: Generating Tree View (with Modules)...');
    registerTreeViewCommand('extension.getTreeViewModulesAnnotated', ['--include-modules', '--include-types'], 'CodeTide: Generating Tree View (with Modules & Types)...');

    // ============== Clipboard Commands ==============

    // Get by IDs (Clipboard)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsClipboard', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds], 'CodeTide: Getting Code Snippets...', async (output) => {
                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('Output copied to clipboard!');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs Shallow (Clipboard)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsShallowClipboard', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '0'], 'CodeTide: Get by IDs (Shallow)', async (output) => {
                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('Output copied to clipboard!');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs Deep (Clipboard)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsDeepClipboard', async () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds?.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Get by IDs (Deep)', async (output) => {
                await vscode.env.clipboard.writeText(output);
                vscode.window.showInformationMessage('Output copied to clipboard!');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Tree View commands (Clipboard)
    const registerTreeViewClipboardCommand = (commandName: string, args: string[], title: string) => {
        context.subscriptions.push(vscode.commands.registerCommand(commandName, async () => {
            const workspacePath = getWorkspacePath();
            if (!workspacePath) return;

            try {
                RunPythonCommand('tree', [workspacePath, ...args], title, async (output) => {
                    await vscode.env.clipboard.writeText(output);
                    vscode.window.showInformationMessage('Tree view copied to clipboard!');
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating tree view: ${error}`);
            }
        }));
    };

    registerTreeViewClipboardCommand('extension.getTreeViewClipboard', [], 'CodeTide: Generating Tree View...');
    registerTreeViewClipboardCommand('extension.getTreeViewModulesClipboard', ['--include-modules'], 'CodeTide: Generating Tree View (with Modules)...');
    registerTreeViewClipboardCommand('extension.getTreeViewModulesAnnotatedClipboard', ['--include-modules', '--include-types'], 'CodeTide: Generating Tree View (with Modules & Types)...');

    // ============== Other Commands ==============

    // Parse specific file
    context.subscriptions.push(vscode.commands.registerCommand('extension.parseFile', () => {
        const workspacePath = getWorkspacePath();
        const editor = vscode.window.activeTextEditor;
        if (!workspacePath || !editor) {
            vscode.window.showErrorMessage("Workspace or editor not available.");
            return;
        }
        
        const filePath = editor.document.uri.fsPath;
        RunPythonCommand('parse', [workspacePath, filePath]);
    }));

    // Refresh command
    context.subscriptions.push(vscode.commands.registerCommand('extension.refresh', () => {
        const workspacePath = getWorkspacePath();
        if (!workspacePath) return;
        RunPythonCommand('refresh', [workspacePath]);
    }));
}

// Helper function to get workspace path (moved here to be accessible by UV commands)
function getWorkspacePath(): string | null {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
        vscode.window.showErrorMessage("No workspace is open.");
        return null;
    }
    return workspacePath;
}

export function deactivate() {
    // Cleanup logic can go here if needed
}