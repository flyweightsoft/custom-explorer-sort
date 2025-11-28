import * as vscode from 'vscode';
import * as path from 'path';

// Returns the absolute workspace root with a trailing separator.
export function workspaceRoot(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) { throw new URIError('No workspace detected'); }
    const root = workspaceFolder.uri.fsPath;
    return root.endsWith(path.sep) ? root : root + path.sep;
}

// Prefixes relative entries with the workspace root, leaves absolute paths untouched.
export function withWorkspaceRoot(fileList: string[]): string[] {
    const root = workspaceRoot();
    const out: string[] = [];
    for (const entry of fileList) {
        out.push(path.isAbsolute(entry) ? entry : path.join(root, entry));
    }
    return out;
}
