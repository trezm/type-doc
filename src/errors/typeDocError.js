'use strict';

import chalk from 'chalk';

export class TypeDocError {
  constructor(message /* t:string */, extras /* t:any */) {
    this.name = 'Generic Error';
    this.message = message;
    this.extras = extras;
  }

  toString() {
    return `${chalk.red('[' + this.name + ']')} ${chalk.magenta(this.message)} ${chalk.gray(this.extras ? '\n' + JSON.stringify(this.extras, null, 2) : '')}`;
  }
}
