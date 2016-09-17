export class Scope {
  constructor(parentScope /* t:Scope? */, declarations=[] /* t:any */) {
    this.parentScope = parentScope;
    this.declarations = declarations;
  }
}
