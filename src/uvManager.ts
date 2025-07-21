import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface UVConfig {
    uvxPath?: string;
    uvPath?: string;
    customInstallPath?: string;
}

export class UVManager {
    private context: vscode.ExtensionContext;
    private configPath: string;
    private config: UVConfig = {};

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configPath = path.join(context.globalStorageUri.fsPath, 'uv-config.json');
        this.loadConfig();
    }

    /**
     * Load configuration from JSON file
     */
    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(configData);
            }
        } catch (error) {
            console.error('Failed to load UV config:', error);
            this.config = {};
        }
    }

    /**
     * Save configuration to JSON file
     */
    private saveConfig(): void {
        try {
            // Ensure directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save UV config:', error);
        }
    }

    /**
     * Get platform-specific default paths
     */
    private getDefaultPaths(): { uvx: string; uv: string } {
        const isWindows = os.platform() === 'win32';
        const homeDir = os.homedir();

        if (isWindows) {
            return {
                uvx: path.join(homeDir, '.local', 'bin', 'uvx.exe'),
                uv: path.join(homeDir, '.local', 'bin', 'uv.exe')
            };
        } else {
            return {
                uvx: path.join(homeDir, '.local', 'bin', 'uvx'),
                uv: path.join(homeDir, '.local', 'bin', 'uv')
            };
        }
    }

    /**
     * Check if a file exists at the given path
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Search for UV/UVX in system PATH
     */
    private async searchInPath(executable: string): Promise<string | null> {
        try {
            const isWindows = os.platform() === 'win32';
            const command = isWindows ? `where ${executable}` : `which ${executable}`;
            
            const { stdout } = await execAsync(command);
            const paths = stdout.trim().split('\n');
            
            for (const execPath of paths) {
                if (await this.fileExists(execPath.trim())) {
                    return execPath.trim();
                }
            }
        } catch {
            // Command failed, executable not found in PATH
        }
        
        return null;
    }

    /**
     * Find UVX executable path
     */
    public async findUVX(): Promise<string | null> {
        // Check if we have a custom path stored
        if (this.config.customInstallPath) {
            const customUVX = path.join(this.config.customInstallPath, os.platform() === 'win32' ? 'uvx.exe' : 'uvx');
            if (await this.fileExists(customUVX)) {
                return customUVX;
            }
        }

        // Check stored paths
        if (this.config.uvxPath && await this.fileExists(this.config.uvxPath)) {
            return this.config.uvxPath;
        }

        // Check default paths
        const defaultPaths = this.getDefaultPaths();
        if (await this.fileExists(defaultPaths.uvx)) {
            this.config.uvxPath = defaultPaths.uvx;
            this.saveConfig();
            return defaultPaths.uvx;
        }

        // Search in system PATH
        const pathResult = await this.searchInPath('uvx');
        if (pathResult) {
            this.config.uvxPath = pathResult;
            this.saveConfig();
            return pathResult;
        }

        return null;
    }

    /**
     * Install UV using platform-specific commands
     */
    private async installUV(): Promise<boolean> {
        try {
            const isWindows = os.platform() === 'win32';
            let command: string;

            if (isWindows) {
                command = 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"';
            } else {
                command = 'curl -LsSf https://astral.sh/uv/install.sh | sh';
            }

            vscode.window.showInformationMessage('Installing UV... This may take a few minutes.');
            
            await execAsync(command, { timeout: 120000 }); // 2 minute timeout
            
            // Wait a moment for installation to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return true;
        } catch (error) {
            console.error('UV installation failed:', error);
            return false;
        }
    }

    /**
     * Show manual installation instructions and prompt for path
     */
    private async promptManualInstallation(): Promise<void> {
        const isWindows = os.platform() === 'win32';
        const installCommand = isWindows 
            ? 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
            : 'curl -LsSf https://astral.sh/uv/install.sh | sh';

        const message = `UV installation failed. Please install UV manually using the following command:

${installCommand}

After installation, please provide the path to the UV installation directory.`;

        const result = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            'Provide Installation Path',
            'Cancel'
        );

        if (result === 'Provide Installation Path') {
            const installPath = await vscode.window.showInputBox({
                prompt: 'Enter the path to the UV installation directory (e.g., /home/user/.local/bin or C:\\Users\\user\\.local\\bin)',
                placeHolder: isWindows ? 'C:\\Users\\user\\.local\\bin' : '/home/user/.local/bin',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Please enter a valid path';
                    }
                    return null;
                }
            });

            if (installPath) {
                this.config.customInstallPath = installPath.trim();
                this.saveConfig();
                
                // Verify the installation
                const uvxPath = await this.findUVX();
                if (uvxPath) {
                    vscode.window.showInformationMessage('UV path configured successfully!');
                } else {
                    vscode.window.showErrorMessage('UVX not found in the provided path. Please check the installation.');
                }
            }
        }
    }

    /**
     * Ensure UVX is available, install if necessary
     */
    public async ensureUVX(): Promise<string | null> {
        // First, try to find existing installation
        let uvxPath = await this.findUVX();
        if (uvxPath) {
            return uvxPath;
        }

        // Try to install UV
        const installSuccess = await this.installUV();
        
        if (installSuccess) {
            // Check if installation worked
            uvxPath = await this.findUVX();
            if (uvxPath) {
                vscode.window.showInformationMessage('UV installed successfully!');
                return uvxPath;
            }
        }

        // Installation failed, prompt for manual installation
        await this.promptManualInstallation();
        
        // Try once more after manual configuration
        return await this.findUVX();
    }

    /**
     * Get UV executable path (for uv commands)
     */
    public async getUVPath(): Promise<string | null> {
        // If we have uvx, we likely have uv in the same directory
        const uvxPath = await this.findUVX();
        if (uvxPath) {
            const uvPath = uvxPath.replace(/uvx(.exe)?$/, 'uv$1');
            if (await this.fileExists(uvPath)) {
                return uvPath;
            }
        }

        // Check stored UV path
        if (this.config.uvPath && await this.fileExists(this.config.uvPath)) {
            return this.config.uvPath;
        }

        // Search in PATH
        const pathResult = await this.searchInPath('uv');
        if (pathResult) {
            this.config.uvPath = pathResult;
            this.saveConfig();
            return pathResult;
        }

        return null;
    }

    /**
     * Reset configuration (for debugging/testing)
     */
    public resetConfig(): void {
        this.config = {};
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    public getConfig(): UVConfig {
        return { ...this.config };
    }
}