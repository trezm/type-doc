'use strict';

export class File {
  constructor(fileName, ast, errors, importedFiles) {
    this.fileName = fileName;
    this.ast = ast;
    this.errors = errors;
    this.importedFiles = importedFiles;
  }

  toString() /* t:string */ {
    const stringifiedErrors = this.errors
      .reduce((a, b) => a + `${this.fileName}: ${b.toString()}`, '');

    return this.importedFiles
      .reduce((a, b) => a + b.toString(), stringifiedErrors);
  }
}
