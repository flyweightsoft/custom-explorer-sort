import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { getWorkspaceRootPath } from './pathing';
import { minimatch } from 'minimatch';

export function loadIgnoreGlobsForFolder(folder: vscode.WorkspaceFolder): string {
    const defaultPattern = '**/.git/**';
    try {
        const rootPath = getWorkspaceRootPath(folder);
        const gitignorePath = rootPath + '.gitignore';
        const fileContent = readFileSync(gitignorePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        lines.push(defaultPattern);
        const noComments = lines.filter(item => item.charAt(0) !== '#');
        const nonEmpty = noComments.filter(item => item !== '');
        const prefixed = nonEmpty.map(file => '**/' + file + '**');
        const trimmed = prefixed.map(file => file.trim());
        let ignorePatterns = trimmed.join(',');
        ignorePatterns = `{${ignorePatterns}}`;
        return ignorePatterns;
    } catch {
        return defaultPattern;
    }
}

// Legacy function for backward compatibility - uses first workspace folder.
export function loadIgnoreGlobs(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) { return '**/.git/**'; }
    return loadIgnoreGlobsForFolder(workspaceFolder);
}

export async function walkWorkspace(folderUri: vscode.Uri, resultSet: Set<string>, ignorePattern: string): Promise<void> {
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    for (const [entryName, entryType] of entries) {
        const entryUri = vscode.Uri.joinPath(folderUri, entryName);
        if (minimatch(entryUri.path, ignorePattern)) {
            continue;
        }
        resultSet.add(entryUri.fsPath);
        if (entryType === vscode.FileType.Directory) {
            await walkWorkspace(entryUri, resultSet, ignorePattern);
        }
    }
}
