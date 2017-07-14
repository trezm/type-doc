import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('real world examples', () => {
  it('should detect an error in our main.js file', () => {
    const errors = new TDTypeChecker(`
import { TDFunctionalChecker } from './lib/TDFunctionalChecker';
import { TDTypeChecker } from './lib/TDTypeChecker';

var s /* t:string */ = 4;

export function main(entryFile='./src/lib/TDScope', checkFunctional=false, options) {
  const tdTypeChecker = new TDTypeChecker(entryFile);
  const tdFunctionalChecker = new TDFunctionalChecker(entryFile);

  let results = [];

  results = results.concat(tdTypeChecker.run(options));

  if (checkFunctional) {
    results = results.concat(tdFunctionalChecker.run(options));
  }

  return results;
}
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should be able to parse TDTypeChecker without an error', () => {
    const errors = new TDTypeChecker('../TDTypeChecker.js').run();

    expect(errors.length).to.equal(0);
  });

  it('should respect typedefs', () => {
    const errors = new TDTypeChecker(`
/**
 * @typedef {Object} Options
 * @property {boolean} dryRun
 * @property {number} prefix
 */

function main() {
  /** @type {Options} */
  let options = {
    dryRun: false,
    prefix: 2
  };

  /** @type {string} */
  let someString = options.prefix;
}
`).run({
      strictClassChecks: true
    });

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  })
});
