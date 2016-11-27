import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('assignments', () => {
  it('should detect errors with numbers', () => {
    const errors = new TDTypeChecker(`
var n /* t:number */;
n = 'asdf';
`).run();

    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[0].extras.actualType).to.equal('string');
  });
});
