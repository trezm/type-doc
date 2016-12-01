const n /* t:Number */ = 1;
const s /* t:String */ = 'asdf';

class TestClass {
  constructor() {
    const s /* t:String */ = this.add(1, 2);
  }

  /**
   * Add two Numbers
   *
   * @param {Number} a - The first Number
   * @param {Number} b - The second Number
   * @returns {Number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }
}
