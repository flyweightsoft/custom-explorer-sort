import { workspaceRoot } from './pathing';
import { readFileSync } from 'fs';
import { outputChannel } from '../ui/output';

export const REGEX_PREFIX = '(regex)';
const ORDER_FILE = '.order';

function readOrderRaw(): string[] {
    const orderPath = workspaceRoot() + ORDER_FILE;
    const fileContent = readFileSync(orderPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);
    const removedEmpty = lines.filter(l => l !== '');
    return removedEmpty.map(l => l.trim());
}

export function extractRegexEntries(lines: string[]): string[] {
    return lines.filter(line => line.startsWith(REGEX_PREFIX));
}

export function readOrderFile(): string[] {
    try {
        return readOrderRaw();
    } catch (error) {
        if (error instanceof URIError) {
            outputChannel.appendLine('Workspace path not detected. Please open a workspace.');
        } else if (error instanceof Error && error.message.includes('ENOENT')) {
            outputChannel.appendLine(`Config file "${ORDER_FILE}" not found.`);
        } else if (error instanceof Error) {
            outputChannel.appendLine(`Failed to load configuration: ${error.message}`);
        } else {
            outputChannel.appendLine('An unknown error occurred.');
        }
        return [] as string[];
    }
}
