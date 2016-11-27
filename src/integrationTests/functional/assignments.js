import { stub } from 'sinon';
import { expect } from 'chai';
import { TDFunctionalChecker } from '../../lib/TDFunctionalChecker';
import { ImmutableError, ScopeAssignmentError } from '../../errors';

describe('[functional] assignments', () => {
  it('should not allow properties to change on an existing object without Object.assign', () => {
    const errors = new TDFunctionalChecker(`
var n = {};
n.p = 'asdf';
`).run();

    expect(errors[0].name).to.equal(ImmutableError.name);
  });

  it('should not allow assignments to variables outside the current scope', () => {
    const errors = new TDFunctionalChecker(`
var n = 1;

function test() {
  n = 2;
}
`).run();

    expect(errors[0].name).to.equal(ScopeAssignmentError.name);
  });
});
