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
     * Show interactive fuzzy ID picker
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
            quickPick.placeholder = 'Type to search IDs, then select from suggestions';
            quickPick.canSelectMany = false; // ← We’ll assume single‐selection for “fill the input” behavior
            quickPick.matchOnDescription = false;
            quickPick.matchOnDetail = false;
            quickPick.title = `Select IDs (${this.cachedIds.length} available) - press Enter to accept`;

            // Keep track of which IDs have been chosen (if you still want multi‐select elsewhere)
            let selectedId: string | undefined;

            const updateItems = (suggestions: IdSuggestion[], query: string = ''): vscode.QuickPickItem[] => {
                return suggestions.map(suggestion => ({
                    label: suggestion.id,
                    description: query && suggestion.score > 0 ? `Score: ${suggestion.score}` : '',
                    detail: ''
                }));
            };

            // (2) Start with the first 50 IDs unfiltered
            const initialSuggestions = this.cachedIds.slice(0, 50).map(id => ({ id, score: 0, matches: true }));
            quickPick.items = updateItems(initialSuggestions);

            // (3) Whenever the user types, re‐run fuzzy and refresh item list
            quickPick.onDidChangeValue((value) => {
                const query = value.trim();
                const suggestions = query
                    ? this.getFuzzySuggestions(query, 50)
                    : this.cachedIds.slice(0, 50).map(id => ({ id, score: 0, matches: true }));
                quickPick.items = updateItems(suggestions, query);
            });

            // (4) When the user moves up/down and selects an item, put it back into the input-box
            quickPick.onDidChangeSelection(selectedItems => {
                if (selectedItems.length > 0) {
                    // Just write the first selected label back to the QuickPick's input field
                    quickPick.value = selectedItems[0].label;
                    selectedId = selectedItems[0].label;
                }
            });

            // (5) When user presses Enter (accept), resolve with whatever is in the input (or the last‐clicked item)
            quickPick.onDidAccept(() => {
                const chosen = quickPick.selectedItems[0]?.label;
                quickPick.hide();
                resolve([chosen]); // if you still want to return something to the caller
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