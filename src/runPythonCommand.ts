
import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export function RunPythonCommand(
    command: string,
    args: string[],
    title = 'Running CodeTide SubProcess',
    onResult?: (output: string) => void
): Promise<void> {
    const pythonScript = path.join(__dirname, '..', 'python', 'tide.py');
    const venvPython = process.platform === 'win32'
        ? path.join(__dirname, '..', 'codetide.venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '..', 'codetide.venv', 'bin', 'python');

    const fullCommand = `"${venvPython}" "${pythonScript}" ${command} ${args.map(arg => `"${arg}"`).join(' ')}`;

    return new Promise<void>((resolve, reject) => {
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
                        exec(fullCommand, (err, stdout, stderr) => {
                            if (err) {
                                vscode.window.showErrorMessage(`Python error: ${err.message}`);
                                execReject(err);
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

                            execResolve(output);
                        });
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}