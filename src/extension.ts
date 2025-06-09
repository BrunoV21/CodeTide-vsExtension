import { FuzzyAutocomplete } from './fuzzyAutoComplete';
import { RunPythonCommand } from './runPythonCommand';
import { PythonEnvironmentManager } from './pythonEnvironmentManager';

import * as vscode from 'vscode';

let pythonEnvManager: PythonEnvironmentManager;

export async function activate(context: vscode.ExtensionContext) {
    try {
        // Initialize Python Environment Manager
        pythonEnvManager = new PythonEnvironmentManager(context);
        
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
        // This allows users to retry or check the environment
        const envCommands = pythonEnvManager?.registerCommands() || [];
        context.subscriptions.push(...envCommands);
        
        return;
    }
}

function initializeExtension(context: vscode.ExtensionContext) {
    // Create fuzzy autocomplete instance
    const fuzzyAutocomplete = new FuzzyAutocomplete();

    // Project parser command
    context.subscriptions.push(vscode.commands.registerCommand('extension.runParser', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        // Check if virtual environment is valid before running
        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        RunPythonCommand('project', [workspacePath], 'CodeTide: Initialize Project');
    }));

    // Get by IDs command with fuzzy autocomplete
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIds', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        // Check if virtual environment is valid before running
        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);

            if (selectedIds === null) {
                // Special case - no cached IDs found, run project initialization
                RunPythonCommand('project', [workspacePath], 'CodeTide: Initialize Project');
                return;
            }

            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            const preview = selectedIds.length > 3
                ? `${selectedIds.slice(0, 3).join(', ')}... (+${selectedIds.length - 3} more)`
                : selectedIds.join(', ');

            vscode.window.showInformationMessage(`Selected ${selectedIds.length} ID(s): ${preview}`);

            RunPythonCommand('get', [workspacePath, ...selectedIds], 'Getting Code Snippets...', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.addIdsToCopilotContext', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);

            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds], 'Fetching Snippets...', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output.trim(),
                    language: 'plaintext'
                });
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(`Added ${selectedIds.length} ID(s) to a new editor for Copilot.`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs (Shallow)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsShallow', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '0'], 'CodeTide: Get by IDs (Shallow)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Add IDs to Copilot Context (Shallow)
    context.subscriptions.push(vscode.commands.registerCommand('extension.addIdsToCopilotContextShallow', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '0'], 'CodeTide: Add IDs to Copilot Context (Shallow)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output.trim(),
                    language: 'plaintext'
                });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`[CodeTide] Added ${selectedIds.length} ID(s) to Copilot context (shallow).`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Get by IDs (Deep)
    context.subscriptions.push(vscode.commands.registerCommand('extension.getByIdsDeep', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Get by IDs (Deep)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output,
                    language: 'plaintext'
                });
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Add IDs to Copilot Context (Deep)
    context.subscriptions.push(vscode.commands.registerCommand('extension.addIdsToCopilotContextDeep', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);
            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Add IDs to Copilot Context (Deep)', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output.trim(),
                    language: 'plaintext'
                });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`[CodeTide] Added ${selectedIds.length} ID(s) to Copilot context (deep).`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting IDs: ${error}`);
        }
    }));

    // Parse specific file
    context.subscriptions.push(vscode.commands.registerCommand('extension.parseFile', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const editor = vscode.window.activeTextEditor;

        if (!workspacePath || !editor) {
            vscode.window.showErrorMessage("Workspace or editor not available.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }

        const filePath = editor.document.uri.fsPath;
        RunPythonCommand('parse', [workspacePath, filePath]);
    }));

    // Optional: Add command to refresh
    context.subscriptions.push(vscode.commands.registerCommand('extension.refresh', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        if (!pythonEnvManager.isVenvValid()) {
            vscode.window.showErrorMessage("Python environment is not properly set up. Please reinstall the Python environment.");
            return;
        }
        
        RunPythonCommand('refresh', [workspacePath]);
    }));
}

/**
 * Get the Python environment manager instance
 * This can be used by other modules that need access to Python paths
 */
export function getPythonEnvironmentManager(): PythonEnvironmentManager {
    return pythonEnvManager;
}

export function deactivate() {
    // Cleanup logic can go here if needed
}