import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[builtins] Promises', () => {
  it('should be able to detect generic inconsistencies', () => {
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
});
