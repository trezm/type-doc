function addOne(x /* t:String */, stringToNumber /* t:String -> Number */) /* t:Number */ {
  return stringToNumber(x) + 1;
}

addOne('0', (aString /* t:String */) => Number(aString));
