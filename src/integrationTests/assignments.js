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

  it('should be able to cast an equality to a boolean', () => {
    const errors = new TDTypeChecker(`
var n /* t:Boolean */;
n = 1 === 2;
`).run();

    expect(errors.length).to.equal(0);
  });
});
