import { RunPythonCommand } from './runPythonCommand';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface FuzzyMatchResult {
    score: number;
    matches: boolean;
}

export interface IdSuggestion {
    id: string;
    score: number;
    matches: boolean;
}

export class FuzzyAutocomplete {
    private cachedIds: string[] = [];
    
    /**
     * Simple fuzzy matching algorithm
     */
    private fuzzyMatch(pattern: string, text: string): FuzzyMatchResult {
        if (!pattern) return { score: 0, matches: true };
        
        pattern = pattern.toLowerCase();
        text = text.toLowerCase();
        
        // Exact substring match gets higher score
        if (text.includes(pattern)) {
            const position = text.indexOf(pattern);
            // Score based on: match length, position (earlier is better), and text length
            const score = 100 + (pattern.length * 10) - position - (text.length - pattern.length);
            return { score, matches: true };
        }
        
        // Fuzzy character matching
        let patternIndex = 0;
        let consecutiveMatches = 0;
        let maxConsecutiveMatches = 0;
        let score = 0;
        
        for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
            if (text[i] === pattern[patternIndex]) {
                consecutiveMatches++;
                maxConsecutiveMatches = Math.max(maxConsecutiveMatches, consecutiveMatches);
                score += 1 + consecutiveMatches; // Bonus for consecutive matches
                patternIndex++;
            } else {
                consecutiveMatches = 0;
            }
        }
        
        const matches = patternIndex === pattern.length;
        const finalScore = matches ? score + (maxConsecutiveMatches * 5) : -1;
        
        return { score: finalScore, matches };
    }

    /**
     * Load cached IDs from storage/cached_ids.json
     */
    public loadCachedIds(workspacePath: string): boolean {
        try {
            const storageDir = path.join(workspacePath, 'storage');
            const cachedIdsPath = path.join(storageDir, 'cached_ids.json');
            
            if (!fs.existsSync(cachedIdsPath)) {
                console.log('cached_ids.json not found in storage directory');
                this.cachedIds = [];
                return false;
            }
            
            const fileContent = fs.readFileSync(cachedIdsPath, 'utf8');
            const data = JSON.parse(fileContent);
            
            // Handle different possible JSON structures
            if (Array.isArray(data)) {
                this.cachedIds = data.map(item => typeof item === 'string' ? item : String(item));
            } else if (data.ids && Array.isArray(data.ids)) {
                this.cachedIds = data.ids.map((item: any) => typeof item === 'string' ? item : String(item));
            } else if (typeof data === 'object') {
                // If it's an object, try to extract string values
                this.cachedIds = Object.keys(data).concat(
                    Object.values(data).filter(v => typeof v === 'string') as string[]
                );
            } else {
                this.cachedIds = [];
            }
            
            // Remove duplicates and empty strings
            this.cachedIds = [...new Set(this.cachedIds.filter(id => id.trim().length > 0))];
            
            console.log(`Loaded ${this.cachedIds.length} cached IDs`);
            return true;
        } catch (error) {
            console.error('Error loading cached IDs:', error);
            this.cachedIds = [];
            return false;
        }
    }

    /**
     * Get fuzzy suggestions for a given query
     */
    public getFuzzySuggestions(query: string, maxResults: number = 50): IdSuggestion[] {
        if (this.cachedIds.length === 0) {
            return [];
        }

        return this.cachedIds
            .map(id => {
                const fuzzyResult = this.fuzzyMatch(query, id);
                return { id, ...fuzzyResult };
            })
            .filter(item => item.matches)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Show interactive fuzzy ID picker with improved multi-select support using "+" separator
     */
    public async showFuzzyIdPicker(workspacePath: string): Promise<string[]> {
        // Load IDs if not loaded
        if (this.cachedIds.length === 0) {
            const loaded = this.loadCachedIds(workspacePath);
            if (!loaded || this.cachedIds.length === 0) {
                vscode.window.showWarningMessage('No cached IDs found. Initializing project...');
                try {
                    // Wait for project initialization to complete
                    await RunPythonCommand('project', [workspacePath], 'CodeTide: Initialize Project');
                    
                    // Give a small delay to ensure files are written
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Try loading IDs again after initialization
                    this.loadCachedIds(workspacePath);
                    
                    if (this.cachedIds.length === 0) {
                        vscode.window.showErrorMessage('Still no IDs found after initialization.');
                        return [];
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Project initialization failed: ${error}`);
                    return [];
                }
            }
        }

        return new Promise((resolve) => {
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
            quickPick.placeholder = 'Type to search IDs, press Enter to select, press Esc to execute';
            quickPick.canSelectMany = false;
            quickPick.matchOnDescription = false;
            quickPick.matchOnDetail = false;
            
            // Track selected IDs
            let selectedIds: string[] = [];
            let isWaitingForSelection = false;
            
            const updateTitle = () => {
                const selectedText = selectedIds.length > 0 ? ` | Selected: ${selectedIds.join(', ')}` : '';
                quickPick.title = `Select IDs (${this.cachedIds.length} available)${selectedText}`;
            };

            const updateItems = (suggestions: IdSuggestion[], query: string = ''): vscode.QuickPickItem[] => {
                return suggestions.map(suggestion => ({
                    label: suggestion.id,
                    description: query, // && suggestion.score > 0 ? `Score: ${suggestion.score}` : '',
                    detail: selectedIds.includes(suggestion.id) ? '✓ Already selected' : ''
                }));
            };

            const getCurrentQuery = (): string => {
                const value = quickPick.value.trim();
                const lastPlusIndex = value.lastIndexOf('+');
                
                if (lastPlusIndex === -1) {
                    return value;
                }
                
                return value.substring(lastPlusIndex + 1).trim();
            };

            const resetForNewSelection = () => {
                quickPick.value = '';
                isWaitingForSelection = true;
                
                // Show initial suggestions
                const initialSuggestions = this.cachedIds.slice(0, 50).map(id => ({ 
                    id, 
                    score: 0, 
                    matches: true 
                }));
                quickPick.items = updateItems(initialSuggestions);
                updateTitle();
            };

            // Start with initial suggestions
            resetForNewSelection();

            // Handle typing
            quickPick.onDidChangeValue((value) => {
                // If user types '+', prepare for next selection
                if (value.endsWith('+')) {
                    const beforePlus = value.substring(0, value.length - 1).trim();
                    
                    // Check if there's a valid ID before the '+'
                    if (beforePlus && this.hasId(beforePlus) && !selectedIds.includes(beforePlus)) {
                        selectedIds.push(beforePlus);
                        resetForNewSelection();
                        return;
                    }
                    
                    // Invalid ID before +, remove the +
                    quickPick.value = beforePlus;
                    return;
                }
                
                // Normal typing - update suggestions based on current query
                const currentQuery = getCurrentQuery();
                
                if (currentQuery.length > 0) {
                    const suggestions = this.getFuzzySuggestions(currentQuery, 50);
                    quickPick.items = updateItems(suggestions, currentQuery);
                } else {
                    const initialSuggestions = this.cachedIds.slice(0, 50).map(id => ({ 
                        id, 
                        score: 0, 
                        matches: true 
                    }));
                    quickPick.items = updateItems(initialSuggestions);
                }
            });

            // Handle Enter key press
            quickPick.onDidAccept(() => {
                const currentValue = quickPick.value.trim();
                const selectedItems = quickPick.selectedItems;
                
                // Case 1: User selected an item from the dropdown
                if (selectedItems.length > 0) {
                    const selectedId = selectedItems[0].label;
                    
                    // Don't add duplicates
                    if (!selectedIds.includes(selectedId)) {
                        selectedIds.push(selectedId);
                    }
                    
                    // Check if user wants to continue selecting (show + prompt)
                    quickPick.value = selectedId + '+';
                    
                    // Small delay to let user see the selection, then reset
                    setTimeout(() => {
                        resetForNewSelection();
                    }, 100);
                    
                    return;
                }
                
                // Case 2: User typed an ID directly
                if (currentValue && this.hasId(currentValue)) {
                    // Don't add duplicates
                    if (!selectedIds.includes(currentValue)) {
                        selectedIds.push(currentValue);
                    }
                    
                    // If input doesn't end with +, this is the final selection
                    if (!currentValue.endsWith('+')) {
                        quickPick.hide();
                        resolve(selectedIds);
                        return;
                    }
                    
                    // Otherwise continue selecting
                    resetForNewSelection();
                    return;
                }
                
                // Case 3: No current input and we have selected IDs - execute command
                if (!currentValue && selectedIds.length > 0) {
                    quickPick.hide();
                    resolve(selectedIds);
                    return;
                }
                
                // Case 4: Nothing selected or invalid input
                if (selectedIds.length === 0) {
                    vscode.window.showInformationMessage('No IDs selected.');
                    quickPick.hide();
                    resolve([]);
                } else {
                    // Execute with currently selected IDs
                    quickPick.hide();
                    resolve(selectedIds);
                }
            });

            quickPick.onDidHide(() => {
                resolve(selectedIds.length > 0 ? selectedIds : []);
            });

            quickPick.show();
        });
    }

    /**
     * Get the number of cached IDs
     */
    public getCachedIdCount(): number {
        return this.cachedIds.length;
    }

    /**
     * Clear cached IDs (useful for refreshing)
     */
    public clearCache(): void {
        this.cachedIds = [];
    }

    /**
     * Check if a specific ID exists in cache
     */
    public hasId(id: string): boolean {
        return this.cachedIds.includes(id);
    }

    /**
     * Get all cached IDs
     */
    public getAllIds(): string[] {
        return [...this.cachedIds];
    }
}