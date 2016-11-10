class TestClass {
  constructor() {
    const s /* t:string */ = this.add(1, 2);
  }

  /**
   * Add two numbers
   *
   * @param {number} a - The first number
   * @param {number} b - The second number
   * @returns {number} - the sum of the arguments
   */
  add(a, b) {
    return a + b;
  }
}
