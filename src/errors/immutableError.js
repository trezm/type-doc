import { TypeDocError } from './typeDocError';

export class ImmutableError extends TypeDocError {
  constructor(message /* t:String */, extras /* t:any */) {
    super(message, extras);

    this.name = 'ImmutableError';
  }
}
