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

  findTypeForName(name /* t:String */) /* t:TDDeclaration */ {
    const declaration = this.methodDeclarations.concat(this.variableDeclarations)
      .find((methodDeclaration) => methodDeclaration.name === name);

    return declaration && declaration.type;
  }
}
