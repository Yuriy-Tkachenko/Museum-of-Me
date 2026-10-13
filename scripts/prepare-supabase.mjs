import { readdir, readFile, writeFile } from 'node:fs/promises';

const files = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
const sections = await Promise.all(files.map(async name => {
  const source = (await readFile(`supabase/migrations/${name}`, 'utf8')).replace(/^\uFEFF/, '').replace(/^\s*(?:begin|commit);\s*$/gim, '');
  return `-- Migration: ${name}\n${source.trim()}`;
}));
const sql = `-- Museum of Me: install once in a NEW empty Supabase project's SQL Editor.\n-- Existing databases: apply only missing individual migrations instead.\n-- All tables, private buckets, RLS policies and grants are installed atomically.\n\nbegin;\n\n${sections.join('\n\n')}\n\nnotify pgrst, 'reload schema';\ncommit;\n`;
await writeFile('supabase/setup-new-project.sql', sql);
console.log(`Prepared supabase/setup-new-project.sql from ${files.length} migrations.`);
