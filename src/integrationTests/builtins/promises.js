import { stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../../lib/TDTypeChecker';

describe('[builtins] Promises', () => {
  it.skip('should be able to detect generic inconsistencies', () => {
    const errors = new TDTypeChecker(`
const p /* t:Promise Number */ = new Promise((resolve, reject) => {
    resolve(2);
});

p.then((result) => {
    const /* t:String */ someResult = result;
});
`).run();

    console.log('errors:', errors);
    expect(errors[0].extras.expectedType).to.equal('Number');
    expect(errors[0].extras.actualType).to.equal('String');
  });
});
