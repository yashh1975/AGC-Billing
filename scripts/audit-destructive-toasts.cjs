const fs = require('fs');
const path = require('path');

function scan(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scan(full));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const lines = fs.readFileSync(full, 'utf-8').split('\n');
      lines.forEach((line, idx) => {
        if (line.includes("'destructive'") || line.includes('"destructive"')) {
          // get context around line (10 lines before)
          const contextStart = Math.max(0, idx - 10);
          const snippet = lines.slice(contextStart, idx + 2).join('\n');
          results.push({
            file: path.relative(path.join(__dirname, '..'), full),
            line: idx + 1,
            snippet
          });
        }
      });
    }
  }
  return results;
}

const list = scan(path.join(__dirname, '..', 'src'));
console.log('Total destructive toasts:', list.length);
list.forEach(item => {
  console.log(`\n=== ${item.file}:${item.line} ===\n${item.snippet}`);
});
