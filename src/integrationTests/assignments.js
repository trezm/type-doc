import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';

describe('assignments', () => {
  it('should detect errors with Numbers', () => {
    const errors = new TDTypeChecker(`
var n /* t:Number */;
n = 'asdf';
`).run();

    expect(errors[0].extras.expectedType).to.equal('Number');
    expect(errors[0].extras.actualType).to.equal('String');
  });
});
