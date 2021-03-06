'use strict';

import { isAbsolute, resolve } from 'path';
import { parse } from 'esprima';
import * as fs from '../loader/file/fsWrapper';

export const DEFAULT_OPTIONS = {
  comment: true,
  loc: true,
  sourceType: 'module'
};

let astCache = {};
export function clearCache() {
  astCache = {};
}

export class TDASTGenerator {
  constructor(entryFile /* t:String */, options=DEFAULT_OPTIONS) {
    options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);

    this._entryFile = entryFile;

    if (options.content) {
      this._entryFileContents = options.content;
    } else {
      try {
        this._entryFileContents = fs.readFileSync(entryFile);
      } catch(e) {
        this._entryFileContents = this._entryFile;
      }
    }

    this._options = options;
    this._ast;
  }

  get ast() {
    if (!this._ast) {
      this._generateAst();
    }

    return this._ast;
  }

  /**
   * Get an ast for the entry file. This also includes any imports, whose
   * respective "program" node ASTs are added to an `imports` property on the
   * returned ast.
   */
  _generateAst() /* t:Object */ {
    let rootAst /* t:Object */;

    if (this._ast) {
      return this._ast;
    }

    try {
      rootAst = parse(this._entryFileContents, this._options);
      this._ast = rootAst;

      const imports /* t:[Object] */ = this._findImports(rootAst);
      const importAsts /* t:[Object] */ = this._generateImportAsts(imports);

      const exportImports /* t:[Object] */ = this._findExportImports(rootAst);
      const exportImportAsts /* t:[Object] */ = this._generateImportAsts(exportImports);

      const requires /* t:[Object] */ = this._findRequires(rootAst);
      const requiresAsts /* t:[Object] */ = this._generateRequiresAsts(requires);

      rootAst.imports = importAsts.concat(exportImportAsts).concat(requiresAsts);
      rootAst.file = fs.resolve(this._entryFile);
    } catch (e) {
      // For now, eat the errors, it's probably an external module.
      rootAst = {
        body: [],
        comments: []
      };
      this._ast = rootAst;
    }

    return rootAst;
  }

  _findImports(ast) /* t:[Object] */ {
    return ast.body.filter((node) => node.type === 'ImportDeclaration');
  }

  _findExportImports(ast) /* t:[Object] */ {
    return ast.body.filter((node) => node.type === 'ExportNamedDeclaration' && node.declaration === null);
  }

  _findRequires(ast, requires=[]) /* t:[Object] */ {
    const body = ast.body.body || ast.body;

    requires = requires.concat(body
      .filter((statement) => Boolean(statement.body))
      .map((statement) => this._findRequires(statement)))
      .reduce((a, b) => a.concat(b), []);

    return requires.concat(
      body.filter((node) => {
        const retval = node.type === 'VariableDeclaration' &&
          node.declarations.filter((declaration) => declaration.init && declaration.init.type === 'CallExpression');

        return retval;
      })
      .map((node) => node.declarations)
      .reduce((a, b) => a.concat(b), [])
      .filter((declarator) => {
        return declarator.init &&
          declarator.init.arguments &&
          declarator.init.arguments.length &&
          /^\.\.?\//.test(declarator.init.arguments[0].value) && // For now, only allow local modules
          declarator.init.type === 'CallExpression' &&
          declarator.init.callee.name === 'require';
      }));
  }

  _generateImportAsts(importList /* t:[Object] */) /* t:[Object] */ {
    const pathArray = fs.resolve(this._entryFile).split('/');
    pathArray.pop();

    importList = importList
      .map((_import) => {
        const path = pathArray.concat([_import.source.value.replace(/^\.\//, '')]).join('/');
        astCache[fs.resolve(path)] = astCache[fs.resolve(path)] || new TDASTGenerator(path);
        let astGenerator = astCache[fs.resolve(path)];

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
    const pathBase = fs.resolve(this._entryFile).split('/');
    pathBase.pop();

    requiresList = requiresList
      .map((_requires) => {
        const source = _requires.init.arguments[0].value.replace(/^\.\//, '');
        const pathArray = pathBase.concat([source]);
        const path = pathArray.join('/');

        astCache[fs.resolve(path)] = astCache[fs.resolve(path)] || new TDASTGenerator(fs.resolve(path));
        let astGenerator = astCache[fs.resolve(path)];

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
