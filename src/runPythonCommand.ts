import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { getUVXPath } from './extension';

export async function RunPythonCommand(
    command: string,
    args: string[],
    title = 'Running CodeTide SubProcess',
    onResult?: (output: string) => void
): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        try {
            // Get UVX path from UV Manager
            const uvxPath = await getUVXPath();
            
            if (!uvxPath) {
                vscode.window.showErrorMessage(
                    'UVX not found. Please run "CodeTide: Setup UV" command first.',
                    'Setup UV'
                ).then(selection => {
                    if (selection === 'Setup UV') {
                        vscode.commands.executeCommand('codetide.setupUV');
                    }
                });
                reject(new Error('UVX not available'));
                return;
            }

            // Build the command arguments
            const uvxArgs = ['--from', 'codetide', 'codetide-cli', command, ...args];
            
            // Create the full command - use the exact path to avoid PATH issues
            const fullCommand = `"${uvxPath}" ${uvxArgs.map(arg => `"${arg}"`).join(' ')}`;
            
            console.log('UVX Path:', uvxPath);
            console.log('Full command:', fullCommand);

            // Get the directory containing uvx for PATH
            const uvxDir = path.dirname(uvxPath);
            
            // Prepare environment with uvx directory in PATH
            const envWithUvx = {
                ...process.env,
                PATH: `${uvxDir}${path.delimiter}${process.env.PATH}`,
            };

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: 'Working ...' });

                    try {
                        const output = await new Promise<string>((execResolve, execReject) => {
                            exec(fullCommand, { env: envWithUvx }, (err, stdout, stderr) => {
                                if (err) {
                                    // Enhanced error handling
                                    const errorMessage = `UVX execution failed: ${err.message}`;
                                    console.error('UVX Error:', err);
                                    console.error('stderr:', stderr);
                                    
                                    // Check for common UVX issues
                                    if (err.message.includes('ENOENT')) {
                                        vscode.window.showErrorMessage(
                                            'UVX executable not found. The installation may be corrupted.',
                                            'Reinstall UV'
                                        ).then(selection => {
                                            if (selection === 'Reinstall UV') {
                                                vscode.commands.executeCommand('codetide.setupUV');
                                            }
                                        });
                                    } else if (stderr.includes('package not found') || stderr.includes('codetide')) {
                                        vscode.window.showErrorMessage(
                                            'CodeTide CLI package not found. Make sure it\'s available on PyPI or install it manually.',
                                            'Install Manually'
                                        ).then(selection => {
                                            if (selection === 'Install Manually') {
                                                vscode.env.openExternal(vscode.Uri.parse('https://pypi.org/project/codetide/'));
                                            }
                                        });
                                    } else {
                                        vscode.window.showErrorMessage(errorMessage);
                                    }
                                    
                                    execReject(err);
                                    return;
                                }

                                if (stderr) {
                                    console.warn(`UVX stderr: ${stderr}`);
                                    // Only show stderr as warning if it's not just informational
                                    if (stderr.includes('error') || stderr.includes('Error')) {
                                        vscode.window.showWarningMessage(`UVX Warning: ${stderr}`);
                                    }
                                }

                                const trimmedOutput = stdout.trim();
                                if (onResult) {
                                    onResult(trimmedOutput);
                                } else if (trimmedOutput.length > 0) {
                                    vscode.window.showInformationMessage(`[CodeTide] ${trimmedOutput}`);
                                }

                                execResolve(trimmedOutput);
                            });
                        });
                        
                        resolve();
                    } catch (error) {
                        console.error('Command execution error:', error);
                        reject(error);
                    }
                }
            );
        } catch (error) {
            console.error('RunPythonCommand setup error:', error);
            reject(error);
        }
    });
}