export class TypeDocError {
  constructor(message /* t:string */, extras /* t:any */) {
    this.name = 'Generic Error';
    this.message = message;
    this.extras = extras;
  }

  toString() {
    return '[' + this.name + '] ' + this.message + (this.extras ? '\n' + JSON.stringify(this.extras, null, 2) : '');
  }
}
