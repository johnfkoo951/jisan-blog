#!/usr/bin/env node
import { romanizeTitle } from '../lib/citations.mjs';
const [title, english] = process.argv.slice(2);
if (!title || !english) { console.error('Usage: node scripts/prepare-citation.mjs "Original title" "English title translation"'); process.exit(1); }
for (const [key,value] of Object.entries({citationTitleSource:title,citationTitleEn:english,citationTitleRomanized:romanizeTitle(title)})) console.log(`${key}: ${JSON.stringify(value)}`);
console.error('Review the translation and romanization, especially names and loanwords, before publishing.');
