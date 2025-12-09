import * as vscode from 'vscode';
import * as path from 'path';

// Returns the absolute workspace root with a trailing separator for a specific folder.
export function getWorkspaceRootPath(folder: vscode.WorkspaceFolder): string {
    const root = folder.uri.fsPath;
    return root.endsWith(path.sep) ? root : root + path.sep;
}

// Legacy function for backward compatibility - uses first workspace folder.
export function workspaceRoot(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) { throw new URIError('No workspace detected'); }
    return getWorkspaceRootPath(workspaceFolder);
}

// Prefixes relative entries with the given workspace root, leaves absolute paths untouched.
export function withWorkspaceRootPath(fileList: string[], rootPath: string): string[] {
    const out: string[] = [];
    for (const entry of fileList) {
        out.push(path.isAbsolute(entry) ? entry : path.join(rootPath, entry));
    }
    return out;
}

// Legacy function for backward compatibility - uses first workspace folder.
export function withWorkspaceRoot(fileList: string[]): string[] {
    return withWorkspaceRootPath(fileList, workspaceRoot());
}
