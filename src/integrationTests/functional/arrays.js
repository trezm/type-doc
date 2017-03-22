import { stub } from 'sinon';
import { expect } from 'chai';
import { TDFunctionalChecker } from '../../lib/TDFunctionalChecker';
import { ImmutableError } from '../../errors';

describe('[functional] arrays', () => {
  it('should not allow Array.prototype.push()', () => {
    const errors = new TDFunctionalChecker(`
let n /* t:Array String */ = ['a'];

function test() {
  n.push('b');
}
`).run();

    expect(errors[0].name).to.equal(ImmutableError.name);
  });

  it('should not allow Array.prototype.pop()', () => {
    const errors = new TDFunctionalChecker(`
let n /* t:Array String */ = ['a'];

function test() {
  n.pop();
}
`).run();

    expect(errors[0].name).to.equal(ImmutableError.name);
  });

  it('should not allow Array.prototype.unshift()', () => {
    const errors = new TDFunctionalChecker(`
let n /* t:Array String */ = ['a'];

function test() {
  n.unshift('b');
}
`).run();

    expect(errors[0].name).to.equal(ImmutableError.name);
  });

  it('should not allow Array.prototype.shift()', () => {
    const errors = new TDFunctionalChecker(`
let n /* t:Array String */ = ['a'];

function test() {
  n.shift();
}
`).run();

    expect(errors[0].name).to.equal(ImmutableError.name);
  });
});
