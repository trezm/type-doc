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

      const requires /* t:[Obejct] */ = this._findRequires(rootAst);
      const requiresAsts /* t:[Object] */ = this._generateRequiresAsts(requires);

      rootAst.imports = importAsts.concat(requiresAsts);
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

  _findRequires(ast) /* t:[Object] */ {
    return ast.body.filter((node) => {
        const retval = node.type === 'VariableDeclaration' &&
          node.declarations.find((declaration) => declaration.init && declaration.init.type === 'CallExpression');

        return retval;
      })
      .map((node) => node.declarations)
      .reduce((a, b) => a.concat(b), [])
      .filter((declarator) => {
        return declarator.init &&
          declarator.init.arguments.length &&
          /^\.\//.test(declarator.init.arguments[0].value) && // For now, only allow local modules
          declarator.init.type === 'CallExpression' &&
          declarator.init.callee.name === 'require';
      });
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
          specifiers: _import.specifiers,
          source: _import.source
        };
      });

    return importList;
  }

  _generateRequiresAsts(requiresList /* t:[Object] */) /* t:[Object] */ {
    const pathArray = this._entryFile.split('/');
    pathArray.pop();

    requiresList = requiresList
      .map((_requires) => {
        const source = _requires.init.arguments[0].value.replace(/^\.\//, '');
        pathArray.push(source);
        const astGenerator = new TDASTGenerator(pathArray.join('/'));
        return {
          astGenerator: astGenerator,
          ast: astGenerator.ast,
          specifiers: _requires.specifiers,
          source: source
        };
      });

    return requiresList;
  }
}
