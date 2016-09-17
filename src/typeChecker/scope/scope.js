export class Scope {
  constructor(parentScope /* t:Scope? */, declarations=[] /* t:any */) {
    this.parentScope = parentScope;
    this.declarations = declarations;
  }
}

export function generateScope(statements /* t:[Object] */) /* t:Scope */ {
  const declarations = statements.filter((statement) => {
    return statement.name === 'declaration' ||
      statement.name === 'function' ||
      statement.name === 'argument'
    });

  return new Scope(null, declarations);
}
