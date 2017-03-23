import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[builtins] Promises', () => {
  it('should be able to detect generic inconsistencies with arrow expressions', () => {
    const errors = new TDTypeChecker(`
const p /* t:Promise Number */ = new Promise((resolve, reject) => {
    resolve(2);
});

p.then((result) => {
    const someResult /* t:String */ = result;
});
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should be able to detect generic inconsistencies with functions', () => {
    const errors = new TDTypeChecker(`
const p /* t:Promise Number */ = new Promise((resolve, reject) => {
    resolve(2);
});

p.then(function(result) {
    const someResult /* t:String */ = result;
});
`).run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });
});
