export class Scope {
  constructor(parentScope /* t:Scope? */, declarations=[] /* t:any */, assignments=[] /* t:any */) {
    this.parentScope = parentScope;
    this.declarations = declarations;
    this.assignments = assignments;
  }
}

export function generateScope(statements /* t:[Object] */) /* t:Scope */ {
  const declarations = statements.filter((statement) => {
    return statement.name === 'declaration' ||
      statement.name === 'function' ||
      statement.name === 'argument' ||
      statement.name === 'export'
    });

  const assignments = statements.filter((statement) => {
    return statement.name === 'assignment' ||
      statement.name === 'classDeclaration';
    });

  return new Scope(null, declarations, assignments);
}
