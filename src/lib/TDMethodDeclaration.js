import { TDDeclaration } from './TDDeclaration';

export class TDMethodDeclaration extends TDDeclaration {
  constructor(type /* t:string */, name /* t:string */) {
    super(type, name);

    this.params = [];
  }

  addParam(param /* t:TDDeclaration */) {
    this.params.push(param);
  }

  findParam(name) {
    return this.params.find((param) => param.name === name);
  }
}
