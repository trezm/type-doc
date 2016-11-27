import { TypeDocError } from './typeDocError';

export class ImmutableError extends TypeDocError {
  constructor(message /* t:string */, extras /* t:any */) {
    super(message, extras);

    this.name = 'ImmutableError';
  }
}
