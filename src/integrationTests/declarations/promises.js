import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[declarations] Promises', () => {
  it('should be able to detect generic inconsistencies with arrow expressions', () => {
    const errors = new TDTypeChecker(`
const p /* t:Promise number */ = new Promise((resolve, reject) => {
    resolve(2);
});

p.then((result) => {
    const someResult /* t:string */ = result;
});
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should be able to detect generic inconsistencies with functions', () => {
    const errors = new TDTypeChecker(`
const p /* t:Promise number */ = new Promise((resolve, reject) => {
    resolve(2);
});

p.then(function(result) {
    const someResult /* t:string */ = result;
});
`).run();

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });
});
