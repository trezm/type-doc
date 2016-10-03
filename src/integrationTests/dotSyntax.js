import { stub } from 'sinon';
import { expect } from 'chai';
import { typeChecker } from '../typeChecker';

describe('dot syntax', () => {
  describe('pojos', () => {
    it('should recognize constants', () => {
      const errors = typeChecker(`
  var a /* t:any */ = {
    s: 'asdf'
  };
  var n /* t:number */ = a.s;
  `);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should recognize variables declarted outside of the pojo', () => {
      const errors = typeChecker(`
  var s /* t:string */ = 'asdf';
  var a /* t:any */ = {
    s: s
  };
  var n /* t:number */ = a.s;
  `);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });

    it('should recognize constant variables declarted outside of the pojo', () => {
      const errors = typeChecker(`
  var s = 'asdf';
  var a /* t:any */ = {
    s: s
  };
  var n /* t:number */ = a.s;
  `);

      expect(errors[0].extras.expectedType).to.equal('number');
      expect(errors[0].extras.actualType).to.equal('string');
    });
  });
});
