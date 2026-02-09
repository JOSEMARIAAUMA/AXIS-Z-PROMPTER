import { PromptItem, CategoryMap, BackupData, SavedComposition } from '../types';

const CURRENT_VERSION = 3; // Incremented version for App Lists
const APP_NAME = "AXIS-Z GESTOR PROMPTS";

/**
 * Creates a JSON blob from the current app state and triggers a browser download.
 */
export const exportBackup = (
    prompts: PromptItem[], 
    categories: CategoryMap, 
    compositions: SavedComposition[] = [], 
    appList: string[] = []
) => {
    const backup: BackupData = {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        appName: APP_NAME,
        prompts,
        categories,
        compositions,
        appList
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Create link and trigger download
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `axis-z-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Validates and parses an uploaded JSON file.
 */
export const validateAndParseBackup = async (file: File): Promise<BackupData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const data = JSON.parse(result);

                // Basic Validation
                if (!data.prompts || !Array.isArray(data.prompts)) {
                    throw new Error("Formato inválido: Falta la lista de prompts.");
                }
                
                // Ensure legacy fields exist
                if (!data.compositions) data.compositions = [];
                if (!data.appList) data.appList = []; 

                resolve(data as BackupData);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("Error al leer el archivo."));
        reader.readAsText(file);
    });
};