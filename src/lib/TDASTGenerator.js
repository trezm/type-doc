'use strict';

import { isAbsolute, resolve } from 'path';
import { parse } from 'esprima';
import { readFileSync } from '../loader/file/fsWrapper';

export const DEFAULT_OPTIONS = {
  comment: true,
  loc: true,
  sourceType: 'module'
};

export class TDASTGenerator {
  constructor(entryFile /* t:string */, options=DEFAULT_OPTIONS) {
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
    let rootAst /* t:Object */;

    try {
      rootAst = parse(this._entryFileContents, this._options);

      const imports /* t:[Object] */ = this._findImports(rootAst);
      const importAsts /* t:[Object] */ = this._generateImportAsts(imports);

      rootAst.imports = importAsts;
      rootAst.file = resolve(this._entryFile);
    } catch (e) {
      // For now, eat the errors, it's probably an external module.
      rootAst = {
        body: [],
        comments: []
      };
    }

    return rootAst;
  }

  _findImports(ast) /* t:[Object] */ {
    return ast.body.filter((node) => node.type === 'ImportDeclaration');
  }

  _generateImportAsts(importList /* t:[Object] */) /* t:[Object] */ {
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
