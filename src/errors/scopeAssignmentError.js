import { TypeDocError } from './typeDocError';

export class ScopeAssignmentError extends TypeDocError {
  constructor(message /* t:string */, extras /* t:any */) {
    super(message, extras);

    this.name = 'ScopeAssignmentError';
  }
}
