import * as vscode from 'vscode';
import { utimesSync } from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

import { getWorkspaceRootPath, withWorkspaceRootPath } from './core/pathing';
import { loadIgnoreGlobsForFolder, walkWorkspace } from './core/fsTraversal';
import { outputChannel } from './ui/output';
import { extractRegexEntries, readOrderFileForFolder, REGEX_PREFIX } from './core/settings';
import { byLocaleCompare } from './core/sorters';

function touchInOrder(fileList: string[]) {
    // Use >1s steps for reliable directory mtime ordering on coarse filesystems
    const stepMs = 1100;
    const base = Date.now();
    outputChannel.appendLine(`=== Modifying timestamps for ${fileList.length} files ===`);
    for (let i = 0; i < fileList.length; i++) {
        const filePath = fileList[i];
        try {
            const newModifiedDate = new Date(base + i * stepMs);
            utimesSync(filePath, newModifiedDate, newModifiedDate);
            outputChannel.appendLine(`✓ ${filePath} -> ${newModifiedDate.toISOString()}`);
        } catch (error) {
            outputChannel.appendLine(`✗ Failed to modify last changed date for file: ${filePath}`);
            outputChannel.appendLine(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            outputChannel.appendLine('');
        }
    }
}

// Note: Do not set explorer.sortOrder programmatically.
// We use package.json contributes.configurationDefaults to set it while the
// extension is installed, so uninstall reverts to VS Code's default/user choice.

function moveRegexMatchesToTail(fileOrder: string[], regexLines: string[]): string[] {
    const filesMatching = fileOrder.filter(file => regexLines.some(regex => {
        const pattern = regex.slice(REGEX_PREFIX.length);
        const fileName = path.basename(file);
        return minimatch(fileName, pattern) || minimatch(file, pattern);
    }));
    const filesNotMatching = fileOrder.filter(file => !filesMatching.includes(file));
    return [...filesNotMatching, ...filesMatching];
}

async function sortedNonOrderedEntriesForFolder(folder: vscode.WorkspaceFolder): Promise<string[]> {
    const order = readOrderFileForFolder(folder);
    const rootPath = getWorkspaceRootPath(folder);
    const entries = new Set<string>();
    const ignorePattern = loadIgnoreGlobsForFolder(folder);
    await walkWorkspace(folder.uri, entries, ignorePattern);

    const absoluteOrder = withWorkspaceRootPath(order.filter(l => !l.startsWith(REGEX_PREFIX)), rootPath);
    const nonOrdered = Array.from(entries).filter(p => !absoluteOrder.includes(p));
    const alphabetic = byLocaleCompare(nonOrdered);
    return moveRegexMatchesToTail(alphabetic, extractRegexEntries(order));
}

async function applyOrderingForFolder(folder: vscode.WorkspaceFolder) {
    const rootPath = getWorkspaceRootPath(folder);
    outputChannel.appendLine(`--- Processing workspace folder: ${folder.name} (${rootPath}) ---`);

    let order = readOrderFileForFolder(folder);
    if (order.length === 0) {
        outputChannel.appendLine(`No .order file found or file is empty in ${folder.name} - skipping`);
        return;
    }
    outputChannel.appendLine(`Config loaded with ${order.length} entries: ${JSON.stringify(order)}`);

    order = order.filter(line => !line.startsWith(REGEX_PREFIX));
    outputChannel.appendLine(`After filtering regex: ${JSON.stringify(order)}`);

    const prefixed = withWorkspaceRootPath(order, rootPath);
    outputChannel.appendLine(`Prefixed file order: ${JSON.stringify(prefixed)}`);

    const others = await sortedNonOrderedEntriesForFolder(folder);
    outputChannel.appendLine(`Non-config files count: ${others.length}`);

    const reversed = [...prefixed].reverse();
    const combined = [...others, ...reversed];

    outputChannel.appendLine(`Processing ${combined.length} files for timestamp modification`);
    touchInOrder(combined);
    outputChannel.appendLine(`Sorting completed for ${folder.name}`);
}

async function applyOrdering() {
    try {
        outputChannel.appendLine('Starting applyOrdering');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            outputChannel.appendLine('No workspace folders detected - cannot sort files');
            return;
        }

        outputChannel.appendLine(`Processing ${workspaceFolders.length} workspace folder(s)`);
        
        for (const folder of workspaceFolders) {
            await applyOrderingForFolder(folder);
        }
        
        outputChannel.appendLine('=== All workspace folders processed ===');
    } catch (error) {
        outputChannel.appendLine(`Error in applyOrdering: ${error instanceof Error ? error.message : 'Unknown error'}`);
        outputChannel.appendLine(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('=== Custom Explorer Sort extension is being activated ===');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        outputChannel.appendLine(`Found ${workspaceFolders.length} workspace folders:`);
        workspaceFolders.forEach((folder, index) => {
            outputChannel.appendLine(`  ${index}: ${folder.uri.fsPath}`);
        });
    } else {
        outputChannel.appendLine('No workspace folders found');
    }

    // Watch for changes to the `.order` file and re-apply ordering automatically
    const orderWatcher = vscode.workspace.createFileSystemWatcher('**/.order');
    const reapply = (event: string, uri: vscode.Uri) => {
        outputChannel.appendLine(`=== ${event}: ${uri.fsPath} ===`);
        applyOrdering();
    };
    orderWatcher.onDidCreate(uri => reapply('Order file created', uri));
    orderWatcher.onDidChange(uri => reapply('Order file changed', uri));
    orderWatcher.onDidDelete(uri => reapply('Order file deleted', uri));
    context.subscriptions.push(orderWatcher);

    // Watch for changes to `.gitignore` as it affects ignored files
    const gitignoreWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
    gitignoreWatcher.onDidCreate(uri => reapply('Gitignore created', uri));
    gitignoreWatcher.onDidChange(uri => reapply('Gitignore changed', uri));
    gitignoreWatcher.onDidDelete(uri => reapply('Gitignore deleted', uri));
    context.subscriptions.push(gitignoreWatcher);

    // Expose a manual command to run ordering on demand

    const applyCmd = vscode.commands.registerCommand('custom-explorer-sort.applyOrdering', async () => {
        outputChannel.appendLine('=== Command: Apply Ordering Now ===');
        await applyOrdering();
    });
    context.subscriptions.push(applyCmd);

    const disposable = vscode.workspace.onDidSaveTextDocument((document) => {
        outputChannel.appendLine(`=== Document saved: ${document.fileName} ===`);
        applyOrdering();
    });

    context.subscriptions.push(disposable);

    outputChannel.appendLine('=== Running initial sort on activation ===');
    applyOrdering();
}

export function deactivate() {
    // Nothing to clean up: configurationDefaults ensures settings revert when the extension is disabled/uninstalled.
}
