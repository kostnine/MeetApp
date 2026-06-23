import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve('migrations');
const files = readdirSync(dir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

for (const file of files) {
  process.stdout.write(`-- ${file}\n`);
  process.stdout.write(readFileSync(resolve(dir, file), 'utf8'));
  process.stdout.write('\n\n');
}
