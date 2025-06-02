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
     * Show interactive fuzzy ID picker with multi-select support using "+" separator
     */
    public async showFuzzyIdPicker(workspacePath: string): Promise<string[]> {
        // (1) Load IDs if not loaded
        if (this.cachedIds.length === 0) {
            const loaded = this.loadCachedIds(workspacePath);
            if (!loaded || this.cachedIds.length === 0) {
                vscode.window.showWarningMessage('No cached IDs found. Make sure storage/cached_ids.json exists and contains ID data.');
                return [];
            }
        }

        return new Promise((resolve) => {
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
            quickPick.placeholder = 'Type to search IDs, use "+" to add multiple IDs, press Enter to confirm selection';
            quickPick.canSelectMany = false;
            quickPick.matchOnDescription = false;
            quickPick.matchOnDetail = false;
            quickPick.title = `Select IDs (${this.cachedIds.length} available) - Use "+" to separate multiple IDs`;

            const updateItems = (suggestions: IdSuggestion[], query: string = ''): vscode.QuickPickItem[] => {
                return suggestions.map(suggestion => ({
                    label: suggestion.id,
                    description: query && suggestion.score > 0 ? `Score: ${suggestion.score}` : '',
                    detail: ''
                }));
            };

            const getCurrentQuery = (fullInput: string): { prefix: string, currentQuery: string } => {
                const lastPlusIndex = fullInput.lastIndexOf('+');
                if (lastPlusIndex === -1) {
                    return { prefix: '', currentQuery: fullInput.trim() };
                }
                
                const prefix = fullInput.substring(0, lastPlusIndex + 1);
                const currentQuery = fullInput.substring(lastPlusIndex + 1).trim();
                return { prefix, currentQuery };
            };

            const parseSelectedIds = (input: string): string[] => {
                return input.split('+')
                    .map(id => id.trim())
                    .filter(id => id.length > 0);
            };

            // (2) Start with the first 50 IDs unfiltered
            const initialSuggestions = this.cachedIds.slice(0, 50).map(id => ({ id, score: 0, matches: true }));
            quickPick.items = updateItems(initialSuggestions);

            // (3) Whenever the user types, re-run fuzzy and refresh item list
            quickPick.onDidChangeValue((value) => {
                const { prefix, currentQuery } = getCurrentQuery(value);
                
                // Always update suggestions based on the current query (part after last +)
                const suggestions = currentQuery.length > 0
                    ? this.getFuzzySuggestions(currentQuery, 50)
                    : this.cachedIds.slice(0, 50).map(id => ({ id, score: 0, matches: true }));
                
                quickPick.items = updateItems(suggestions, currentQuery);
            });

            let pendingSelection = false;

            // (4) When the user navigates through items (but hasn't pressed Enter yet)
            quickPick.onDidChangeSelection(selectedItems => {
                // Don't automatically add to input on selection change
                // Wait for user to press Enter to confirm the selection
            });

            // (5) Handle Enter key press
            quickPick.onDidAccept(() => {
                const currentInput = quickPick.value.trim();
                const selectedItems = quickPick.selectedItems;
                
                // Check if user has selected an item from the dropdown
                if (selectedItems.length > 0) {
                    const selectedId = selectedItems[0].label;
                    const { prefix } = getCurrentQuery(currentInput);
                    
                    // Add the selected ID to the input with "+" separator
                    if (prefix) {
                        quickPick.value = prefix + selectedId + '+';
                    } else {
                        quickPick.value = selectedId + '+';
                    }
                    
                    // Clear selection and reset items for next selection
                    quickPick.selectedItems = [];
                    
                    // Force refresh of suggestions for the empty query after the new +
                    setTimeout(() => {
                        const suggestions = this.cachedIds.slice(0, 50).map(id => ({ id, score: 0, matches: true }));
                        quickPick.items = updateItems(suggestions);
                    }, 10);
                    
                    return; // Don't execute command yet, continue selecting
                }
                
                // No item selected from dropdown, check if we should execute the command
                if (currentInput.endsWith('+')) {
                    // Input ends with '+', user might want to add more
                    return;
                }
                
                // Check if the current input (without +) matches an existing ID exactly
                if (currentInput && this.hasId(currentInput)) {
                    // Single exact match, execute with this ID
                    quickPick.hide();
                    resolve([currentInput]);
                    return;
                }
                
                // Parse multiple IDs from input
                const selectedIds = parseSelectedIds(currentInput);
                
                if (selectedIds.length === 0) {
                    vscode.window.showInformationMessage('No IDs selected.');
                    quickPick.hide();
                    resolve([]);
                    return;
                }
                
                // Validate that all selected IDs exist in cache
                const validIds = selectedIds.filter(id => this.hasId(id));
                const invalidIds = selectedIds.filter(id => !this.hasId(id));
                
                if (invalidIds.length > 0) {
                    vscode.window.showWarningMessage(`Invalid IDs found: ${invalidIds.join(', ')}`);
                }
                
                if (validIds.length === 0) {
                    vscode.window.showInformationMessage('No valid IDs selected.');
                    quickPick.hide();
                    resolve([]);
                    return;
                }
                
                quickPick.hide();
                resolve(validIds);
            });

            quickPick.onDidHide(() => {
                resolve([]);
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