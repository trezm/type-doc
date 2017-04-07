import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('real world examples', () => {
  it('should detect an error in our main.js file', () => {
    const errors = new TDTypeChecker(`
import { TDFunctionalChecker } from './lib/TDFunctionalChecker';
import { TDTypeChecker } from './lib/TDTypeChecker';

var s /* t:String */ = 4;

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

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should be able to parse TDTypeChecker without an error', () => {
    const errors = new TDTypeChecker('../TDTypeChecker.js').run();

    expect(errors.length).to.equal(0);
  });
});
