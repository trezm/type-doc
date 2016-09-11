import { TypeDocError } from './typeDocError';

export class TypeMismatchError extends TypeDocError {
  constructor(message /* t:string */, extras /* t:any */) {
    super(message, extras);

    this.name = 'Type Mismatch Error';
  }
}
