import { TypeDocError } from './typeDocError';

export class TypeMismatchError extends TypeDocError {
  constructor(message /* t:String */, extras /* t:any */) {
    super(message, extras);

    this.name = 'TypeMismatchError';
  }
}
