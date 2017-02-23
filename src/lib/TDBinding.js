export class TDBinding {
  constructor(returnType) {
    this.returnType = returnType;
    this.methodDeclarations = [];
    this.variableDeclarations = [];
  }

  addMethodDeclaration(methodDeclaration /* t:TDDeclaration */) {
    this.methodDeclarations.push(methodDeclaration);
  }

  addVariableDeclarations(variableDeclaration /* t:TDDeclaration */) {
    this.variableDeclarations.push(variableDeclaration);
  }

  findDeclarationForName(name /* t:String */) /* t:TDDeclaration */ {
    return this.methodDeclarations.concat(this.variableDeclarations)
      .find((methodDeclaration) => methodDeclaration.name === name);
  }
}
