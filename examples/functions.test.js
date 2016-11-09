function a(x /* t:string */) /* t:string */ {       // 2
  function b(y /* t:string */) /* t:string */ {     // 3
    function c(z /* t:string */) /* t:string */ {   // 4
      return y + x + z;                             // 5
    }                                               // 6
                                                    // 7
    return c(y);                                    // 8
  }                                                 // 9
                                                    // 10
  return b(x);                                      // 11
}
