'use strict';

import { parse } from 'esprima';
import { readFileSync } from '../loader/file/fsWrapper';

export const DEFAULT_OPTIONS = {
  comment: true,
  loc: true,
  sourceType: 'module'
};

export class TDASTGenerator {
  constructor(entryFile, options=DEFAULT_OPTIONS) {
    this._entryFile = entryFile;

    try {
      this._entryFileContents = readFileSync(entryFile);
    } catch(e) {
      this._entryFileContents = this._entryFile;
    }

    this._options = options;
  }

  /**
   * Get an ast for the entry file. This also includes any imports, whose
   * respective "program" node ASTs are added to an `imports` property on the
   * returned ast.
   */
  get ast() /* t:Object */ {
    const rootAst = parse(this._entryFileContents, this._options);

    const imports = this._findImports(rootAst);
    const importAsts = this._generateImportAsts(imports);

    rootAst.imports = importAsts;

    return rootAst;
  }

  _findImports(ast) {
    return ast.body.filter((node) => node.type === 'ImportDeclaration');
  }

  _generateImportAsts(importList) {
    const pathArray = this._entryFile.split('/');
    pathArray.pop();

    importList = importList
      .map((_import) => {
        pathArray.push(_import.source.value.replace(/^\.\//, ''));
        const astGenerator = new TDASTGenerator(pathArray.join('/'));
        return {
          astGenerator: astGenerator,
          ast: astGenerator.ast,
          specifiers: _import.specifiers
        };
      });

    return importList;
  }
}
