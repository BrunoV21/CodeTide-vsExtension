import { FuzzyAutocomplete } from './fuzzyAutoComplete';
import { RunPythonCommand } from './runPythonCommand';
import { PythonEnvironmentManager } from './pythonEnvironmentManager';
import * as vscode from 'vscode';

let pythonEnvManager: PythonEnvironmentManager;

export async function activate(context: vscode.ExtensionContext) {
    try {
        // Initialize Python Environment Manager with extension ID
        const extensionId = 'your.publisher.codetide'; // Replace with your actual extension ID
        pythonEnvManager = new PythonEnvironmentManager(context, extensionId);
        
        // Check Python installation and setup virtual environment
        await pythonEnvManager.setupPythonEnvironment();
        
        // Register Python environment management commands
        const envCommands = pythonEnvManager.registerCommands();
        context.subscriptions.push(...envCommands);
        
        // Initialize the main extension functionality
        initializeExtension(context);
        
        // Show success message
        vscode.window.showInformationMessage('CodeTide Extension activated successfully!');
        
    } catch (error) {
        vscode.window.showErrorMessage(`CodeTide Extension failed to initialize: ${error}`);
        
        // Still register basic commands even if Python setup fails
        const envCommands = pythonEnvManager?.registerCommands() || [];
        context.subscriptions.push(...envCommands);
        
        return;
    }
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

    // Project parser command
    context.subscriptions.push(vscode.commands.registerCommand('extension.runParser', () => {
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

export function getPythonEnvironmentManager(): PythonEnvironmentManager {
    return pythonEnvManager;
}

export function deactivate() {
    // Cleanup logic can go here if needed
}