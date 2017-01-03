import { sandbox as s, stub } from 'sinon';
import { expect } from 'chai';
import { TDTypeChecker } from '../lib/TDTypeChecker';
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

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(0);
  });

  it('should throw errors caused by multiple files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `export const test /* t:Number */ = 2;`,
        './main': `
import { test } from './test';

var s /* t:String */ = test
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should run tests on the imported files', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
let aNumber /* t:Number */ = 3;
export const test /* t:String */ = aNumber;
`,
        './main': `
import { test } from './test';

var s /* t:String */ = test
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
  });

  it('should handle multiple imports', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
let aNumber /* t:Number */ = 3;
export const test1 /* t:String */ = aNumber;
export const test2 /* t:String */ = aNumber;
`,
        './main': `
import { test1, test2 } from './test';
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.expectedType).to.equal('String');
    expect(errors[0].extras.actualType).to.equal('Number');
    expect(errors[1].extras.expectedType).to.equal('String');
    expect(errors[1].extras.actualType).to.equal('Number');
  });

  it('should handle multiple with different types', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:String */ = 'asdf';
export const test2 /* t:Number */ = 1;
`,
        './main': `
import { test1, test2 } from './test';

const thing1 /* t:Number */ = test1;
const thing2 /* t:String */ = test2;
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.actualType).to.equal('String');
    expect(errors[0].extras.expectedType).to.equal('Number');
    expect(errors[1].extras.expectedType).to.equal('String');
    expect(errors[1].extras.actualType).to.equal('Number');
  });

  it('should handle aliases with different types', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync', (file) => {
      return {
        './test': `
export const test1 /* t:String */ = 'asdf';
`,
        './main': `
import { test1 as test2 } from './test';

const thing1 /* t:Number */ = test2;
`
      }[file];
    });

    const errors = new TDTypeChecker('./main').run();

    expect(errors[0].extras.actualType).to.equal('String');
    expect(errors[0].extras.expectedType).to.equal('Number');
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

    const errors = new TDTypeChecker('./main').run();

    expect(errors.length).to.equal(0);
  });
});
