export class TDBinding {
  constructor() {
    this.methodDeclarations = [];
    this.variableDeclarations = [];
  }

  addMethodDeclaration(methodDeclaration /* t:TDMethodDeclaration */) {
    this.methodDeclarations.push(methodDeclaration);
  }

  addVariableDeclarations(variableDeclaration /* t:TDDeclaration */) {
    this.methodDeclarations.push(variableDeclaration);
  }

  findDeclarationForName(name /* t:string */) /* t:TDDeclaration */ {
    return this.methodDeclarations.concat(this.variableDeclarations)
      .find((methodDeclaration) => methodDeclaration.name === name);
  }
}
