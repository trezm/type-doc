#!/usr/bin/env node

const fs = require('fs');
const generateASTFromPath = require('../dist/lib/TDDeclarationImporter').generateASTFromPath;

fs.writeFileSync('./dist/lib.json', JSON.stringify(generateASTFromPath(__dirname + '/../node_modules/typescript/lib/lib.d.ts')));
