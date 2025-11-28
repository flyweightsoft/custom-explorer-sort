export function byLocaleCompare(files: string[]): string[] {
    const sorted = files.sort((a, b) => a.localeCompare(b));
    return sorted;
}
