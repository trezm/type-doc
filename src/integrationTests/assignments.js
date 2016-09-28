import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('assignments', () => {
  it.skip('should detect errors with numbers', () => {
    const errors = typeChecker(`
var n /* t:number */;
n = 'asdf';
`);

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });
});
