#!/usr/bin/env node
const [title, english] = process.argv.slice(2);
if (!title || !english) { console.error('Usage: node scripts/prepare-citation.mjs "Original title" "English title translation"'); process.exit(1); }
for (const [key,value] of Object.entries({citationTitleSource:title,citationTitleEn:english})) console.log(`${key}: ${JSON.stringify(value)}`);
console.error('The English reference cites this translation as the title. Write it in sentence case and review names and product spellings before publishing.');
