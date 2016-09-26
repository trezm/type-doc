import * as fs from 'fs';

export function readFileSync(name /* t:string */) /* t:string */ {
  return fs.readFileSync(name);
}
