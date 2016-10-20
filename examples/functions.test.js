function d(x /* t:string */) /* t:string */ {
  function e(y /* t:string */) /* t:string */ {
    function f(z /* t:string */) /* t:number */ {
      return y + x + z;
    }

    return f(y);
  }

  return e(x);
}
