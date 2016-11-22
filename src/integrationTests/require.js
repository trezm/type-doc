import { sandbox as s, stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';
import * as fs from '../loader/file/fsWrapper';

describe('require', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = s.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should not throw an error with multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `var n = 2;`,
        './main': `
const test = require('./test');
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors.length).to.equal(0);
  });

  it('should throw errors caused by multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
const test /* t:number */ = 2;

module.exports = test;`,
        './main': `
const test = require('./test');

var s /* t:string */ = test
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should run tests on the imported files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
let aNumber /* t:number */ = 3;
const test /* t:string */ = aNumber;
module.exports = test;
`,
        './main': `
const test = require('./test');

var s /* t:string */ = test
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });
});
