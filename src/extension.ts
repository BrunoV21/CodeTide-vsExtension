import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import { FuzzyAutocomplete } from './fuzzyAutoComplete';

function runPythonCommand(
    command: string,
    args: string[],
    title = 'Running Python Script',
    onResult?: (output: string) => void // <- NEW
) {
    const pythonScript = path.join(__dirname, '..', 'python', 'tide.py');

    const venvPython = process.platform === 'win32'
        ? path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '..', 'venv', 'bin', 'python');

    const fullCommand = `"${venvPython}" "${pythonScript}" ${command} ${args.map(arg => `"${arg}"`).join(' ')}`;

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        },
        async (progress) => {
            progress.report({ message: 'Running Python CLI...' });

            return new Promise<void>((resolve) => {
                exec(fullCommand, (err, stdout, stderr) => {
                    if (err) {
                        vscode.window.showErrorMessage(`Python error: ${err.message}`);
                        resolve();
                        return;
                    }

                    if (stderr) {
                        console.error(`Python stderr: ${stderr}`);
                    }

                    const output = stdout.trim();
                    if (onResult) {
                        onResult(output);
                    } else if (output.length > 0) {
                        vscode.window.showInformationMessage(`[CodeTide] ${output}`);
                    }

                    resolve();
                });
            });
        }
    );
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "timestamp-commentor" is now active!');

    // Create fuzzy autocomplete instance
    const fuzzyAutocomplete = new FuzzyAutocomplete();

    // Project parser command
    context.subscriptions.push(vscode.commands.registerCommand('extension.runParser', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        runPythonCommand('project', [workspacePath], 'CodeTide: Initialize Project');
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

            if (selectedIds.length === 0) {
                vscode.window.showInformationMessage('No IDs selected.');
                return;
            }

            const preview = selectedIds.length > 3
                ? `${selectedIds.slice(0, 3).join(', ')}... (+${selectedIds.length - 3} more)`
                : selectedIds.join(', ');

            vscode.window.showInformationMessage(`Selected ${selectedIds.length} ID(s): ${preview}`);

            runPythonCommand('get', [workspacePath, ...selectedIds], 'Getting Code Snippets...', async (output) => {
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

            runPythonCommand('get', [workspacePath, ...selectedIds], 'Fetching Snippets...', async (output) => {
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

            runPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Get by IDs (Deep)', async (output) => {
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

            runPythonCommand('get', [workspacePath, ...selectedIds, '--degree', '2'], 'CodeTide: Add IDs to Copilot Context (Deep)', async (output) => {
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
        runPythonCommand('parse', [workspacePath, filePath]);
    }));

    // Optional: Add command to refresh cached IDs
    context.subscriptions.push(vscode.commands.registerCommand('extension.refreshCachedIds', () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        fuzzyAutocomplete.clearCache();
        const loaded = fuzzyAutocomplete.loadCachedIds(workspacePath);
        
        if (loaded) {
            const count = fuzzyAutocomplete.getCachedIdCount();
            vscode.window.showInformationMessage(`Refreshed cached IDs. Found ${count} IDs.`);
        } else {
            vscode.window.showWarningMessage('Failed to load cached IDs from storage/cached_ids.json');
        }
    }));
}

export function deactivate() {}