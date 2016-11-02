import { sandbox as s, stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';
import * as fs from '../loader/file/fsWrapper';

describe('import', () => {
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
import { test } from './test';
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors.length).to.equal(0);
  });

  it('should throw errors caused by multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `export const test /* t:number */ = 2;`,
        './main': `
import { test } from './test';

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
export const test /* t:string */ = aNumber;
`,
        './main': `
import { test } from './test';

var s /* t:string */ = test
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
  });

  it('should handle multiple imports', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
let aNumber /* t:number */ = 3;
export const test1 /* t:string */ = aNumber;
export const test2 /* t:string */ = aNumber;
`,
        './main': `
import { test1, test2 } from './test';
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.expectedType).to.equal('string');
    expect(errors[0].extras.actualType).to.equal('number');
    expect(errors[1].extras.expectedType).to.equal('string');
    expect(errors[1].extras.actualType).to.equal('number');
  });

  it('should handle multiple with different types', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:string */ = 'asdf';
export const test2 /* t:number */ = 1;
`,
        './main': `
import { test1, test2 } from './test';

const thing1 /* t:number */ = test1;
const thing2 /* t:string */ = test2;
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.actualType).to.equal('string');
    expect(errors[0].extras.expectedType).to.equal('number');
    expect(errors[1].extras.expectedType).to.equal('string');
    expect(errors[1].extras.actualType).to.equal('number');
  });

  it('should handle aliases with different types', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:string */ = 'asdf';
`,
        './main': `
import { test1 as test2 } from './test';

const thing1 /* t:number */ = test2;
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors[0].extras.actualType).to.equal('string');
    expect(errors[0].extras.expectedType).to.equal('number');
  });

  it('should handle class exports', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
export class Test {
  constructor() {}
}`,
        './main': `
import { Test } from './test';
`
      }[file];
    });

    const errors = typeChecker('./main');

    expect(errors.length).to.equal(0);
  });
});
