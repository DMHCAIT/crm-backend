const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function findTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git'].includes(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTests(filename);
    return /\.test\.(?:cjs|mjs|js)$/.test(entry.name) ? [filename] : [];
  });
}

const files = findTests(root).sort();
if (!files.length) throw new Error('No backend test files found');
console.log(`Running all ${files.length} backend test files`);
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit'
});
if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
