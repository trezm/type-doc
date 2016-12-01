'use strict';

import chalk from 'chalk';

export class TypeDocError {
  constructor(message /* t:String */, extras /* t:any */) {
    this.name = 'GenericError';
    this.message = message;
    this.extras = extras;
  }

  toString() {
    return `${chalk.red('[' + this.name + ']')} ${chalk.magenta(this.message)} ${chalk.gray(this.extras ? '\n' + JSON.stringify(this.extras, null, 2) : '')}`;
  }
}
