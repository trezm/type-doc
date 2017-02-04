import { TypeDocError } from './typeDocError';

export class UndeclaredError extends TypeDocError {
  constructor(message /* t:String */, extras /* t:any */) {
    super(message, extras);

    this.name = 'UndeclaredError';
  }
}
