import { FuzzyAutocomplete } from './fuzzyAutoComplete';
import { RunPythonCommand } from './runPythonCommand';

import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

    // Create fuzzy autocomplete instance
    const fuzzyAutocomplete = new FuzzyAutocomplete();

    // Project parser command
    context.subscriptions.push(vscode.commands.registerCommand('extension.runParser', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
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

        try {
            const selectedIds = await fuzzyAutocomplete.showFuzzyIdPicker(workspacePath);

            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            RunPythonCommand('get', [workspacePath, ...selectedIds], 'Fetching Snippets...', async (output) => {
                const doc = await vscode.workspace.openTextDocument({
                    content: output.trim(),
                    language: 'plaintext' // Or use 'typescript', 'markdown', etc. based on your data
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
        
        RunPythonCommand('refresh', [workspacePath]);
    }));
}

export function deactivate() {}