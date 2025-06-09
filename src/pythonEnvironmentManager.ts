import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PythonEnvironmentManager {
    private extensionContext: vscode.ExtensionContext;
    private extensionId: string;

    constructor(context: vscode.ExtensionContext, extensionId: string) {
        this.extensionContext = context;
        this.extensionId = extensionId;
    }

    /**
     * Main setup method that checks Python installation and sets up virtual environment
     */
    async setupPythonEnvironment(): Promise<void> {
        // Check if Python is installed
        if (!(await this.isPythonInstalled())) {
            const action = await vscode.window.showErrorMessage(
                'CodeTide Extension requires Python to be installed. Please install Python and restart VSCode.',
                'Download Python',
                'Cancel'
            );
            
            if (action === 'Download Python') {
                vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
            
            throw new Error('Python is not installed');
        }

        // Check and setup virtual environment
        const venvPath = this.getVenvPath();
        const requirementsPath = this.getRequirementsPath();

        if (!fs.existsSync(venvPath)) {
            // Create environment if it doesn't exist
            await this.createVirtualEnvironment(venvPath, requirementsPath);
        }
        // Otherwise do nothing - no automatic updates
    }

    /**
     * Explicitly update the Python dependencies
     */
    async updateDependencies(): Promise<void> {
        const venvPath = this.getVenvPath();
        const requirementsPath = this.getRequirementsPath();

        if (!fs.existsSync(venvPath)) {
            vscode.window.showErrorMessage('Python environment does not exist. Please reinstall the extension.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "CodeTide: Updating Python dependencies...",
                cancellable: false
            }, async () => {
                const pipPath = this.getPipCommand(venvPath);
                await execAsync(`"${pipPath}" install -r "${requirementsPath}"`);
                
                // Update the requirements timestamp
                const venvStatsPath = path.join(venvPath, '.requirements_timestamp');
                const requirementsStats = fs.statSync(requirementsPath);
                fs.writeFileSync(venvStatsPath, requirementsStats.mtimeMs.toString());
            });
            
            vscode.window.showInformationMessage('CodeTide: Dependencies updated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update dependencies: ${error}`);
        }
    }

    /**
     * Check if Python is installed on the system
     */
    private async isPythonInstalled(): Promise<boolean> {
        try {
            // Try different Python commands that might be available
            const pythonCommands = ['python3', 'python', 'py'];
            
            for (const cmd of pythonCommands) {
                try {
                    await execAsync(`${cmd} --version`);
                    return true;
                } catch {
                    continue;
                }
            }
            
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Create a new virtual environment and install dependencies
     */
    private async createVirtualEnvironment(venvPath: string, requirementsPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "CodeTide: Setting up Python environment...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 0, message: "Creating virtual environment..." });
                    
                    // Get Python command
                    const pythonCmd = await this.getPythonCommand();
                    
                    // Create virtual environment
                    await execAsync(`${pythonCmd} -m venv "${venvPath}"`);
                    
                    progress.report({ increment: 50, message: "Installing dependencies..." });
                    
                    // Install requirements
                    if (fs.existsSync(requirementsPath)) {
                        const pipPath = this.getPipCommand(venvPath);
                        await execAsync(`"${pipPath}" install -r "${requirementsPath}"`);
                        
                        // Store requirements timestamp
                        const venvStatsPath = path.join(venvPath, '.requirements_timestamp');
                        const requirementsStats = fs.statSync(requirementsPath);
                        fs.writeFileSync(venvStatsPath, requirementsStats.mtimeMs.toString());
                    }
                    
                    progress.report({ increment: 100, message: "Setup complete!" });
                    
                    vscode.window.showInformationMessage('CodeTide: Python environment setup completed successfully!');
                    resolve();
                    
                } catch (error) {
                    reject(new Error(`Failed to create virtual environment: ${error}`));
                }
            });
        });
    }

    /**
     * Get the Python command that works on the system
     */
    private async getPythonCommand(): Promise<string> {
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const cmd of pythonCommands) {
            try {
                await execAsync(`${cmd} --version`);
                return cmd;
            } catch {
                continue;
            }
        }
        
        throw new Error('No Python command found');
    }

    /**
     * Get the pip command path for the virtual environment
     */
    private getPipCommand(venvPath: string): string {
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            return path.join(venvPath, 'Scripts', 'pip.exe');
        } else {
            return path.join(venvPath, 'bin', 'pip');
        }
    }

    /**
     * Get the Python executable path from the virtual environment
     */
    getPythonExecutablePath(): string {
        const venvPath = this.getVenvPath();
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            return path.join(venvPath, 'Scripts', 'python.exe');
        } else {
            return path.join(venvPath, 'bin', 'python');
        }
    }

    /**
     * Get the virtual environment path
     */
    private getVenvPath(): string {
        return path.join(this.extensionContext.extensionPath, 'codetide.venv');
    }

    /**
     * Get the requirements.txt path
     */
    private getRequirementsPath(): string {
        return path.join(this.extensionContext.extensionPath, 'python', 'requirements.txt');
    }

    /**
     * Check if the virtual environment exists and is valid
     */
    isVenvValid(): boolean {
        const venvPath = this.getVenvPath();
        const pythonPath = this.getPythonExecutablePath();
        
        return fs.existsSync(venvPath) && fs.existsSync(pythonPath);
    }

    /**
     * Reinstall the Python virtual environment
     */
    async reinstallVirtualEnvironment(): Promise<void> {
        const venvPath = this.getVenvPath();
        const requirementsPath = this.getRequirementsPath();

        // Remove existing virtual environment
        if (fs.existsSync(venvPath)) {
            const isWindows = process.platform === 'win32';
            const rmCommand = isWindows ? `rmdir /s /q "${venvPath}"` : `rm -rf "${venvPath}"`;
            await execAsync(rmCommand);
        }

        // Recreate virtual environment
        await this.createVirtualEnvironment(venvPath, requirementsPath);
    }

    /**
     * Register commands related to Python environment management
     */
    registerCommands(): vscode.Disposable[] {
        const commands: vscode.Disposable[] = [];

        // Command to reinstall Python environment
        commands.push(vscode.commands.registerCommand('extension.reinstallPythonEnv', async () => {
            try {
                await this.reinstallVirtualEnvironment();
                vscode.window.showInformationMessage('CodeTide: Python environment reinstalled successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to reinstall Python environment: ${error}`);
            }
        }));

        // Command to update Python dependencies
        commands.push(vscode.commands.registerCommand('extension.updatePythonDependencies', async () => {
            try {
                await this.updateDependencies();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to update dependencies: ${error}`);
            }
        }));

        // Command to check Python environment status
        commands.push(vscode.commands.registerCommand('extension.checkPythonEnv', async () => {
            try {
                const isInstalled = await this.isPythonInstalled();
                const isVenvValid = this.isVenvValid();
                
                let status = 'Python Environment Status:\n';
                status += `• Python installed: ${isInstalled ? '✓' : '✗'}\n`;
                status += `• Virtual environment: ${isVenvValid ? '✓' : '✗'}\n`;
                status += `• Virtual environment path: ${this.getVenvPath()}`;
                
                vscode.window.showInformationMessage(status);
            } catch (error) {
                vscode.window.showErrorMessage(`Error checking Python environment: ${error}`);
            }
        }));

        return commands;
    }
}