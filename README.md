<!--
  Custom Explorer Sort — short README
-->

# Custom Explorer Sort

Sort files and folders in VS Code’s Explorer using a simple `.order` file at your workspace root. It respects `.gitignore`, adjusts mtimes safely, and logs to the “Custom Explorer Sort” Output channel.

[Install from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=FlyweightSoft.custom-explorer-sort)

## What it does

- Items listed in `.order` appear first, in your order
- Pattern lines with `(regex)` use glob-like matching (minimatch)
- Everything else follows alphabetically
- Ignores anything excluded by `.gitignore` (and always ignores `.git/`)

How it works: the extension temporarily sets Explorer sort to “modified” and bumps mtimes with ~1.1s spacing to ensure a stable order; it restores your sort on deactivate.

## Quick start

1) Create `.order` in your workspace root.

Example `.order`:

```
README.md
src
docs
(regex)**/*.test.ts
(regex)*.json
```

Behavior:
- The three listed entries are pinned first (in that order)
- Then any file matching the patterns (e.g. all `*.test.ts`, all `*.json`)
- Then the rest of the workspace, A→Z

Tip: Matching is checked against both the filename and its path relative to the workspace root.

## Commands and notes

- Command: “Custom Explorer Sort: Apply Order Now”
- Works in folder workspaces on VS Code 1.96.0+
- Save any file or change `.order` to re-apply automatically

## License

MIT — see `LICENSE.md`.

Contact: FlyweightSoft • santhosh@flyweightsoft.com

