import * as fs from 'fs';

export function readFileSync(name /* t:string */) /* t:string */ {
  name = _isADirectoryWithAnIndex(name) || _isAJsFile(name);

  if (!name) {
    throw new Error(`${name} does not exist.`);
  }

  return fs.readFileSync(name, 'utf8');
}

function _isADirectoryWithAnIndex(name) /* t:string? */ {
  try {
    let stat = fs.lstatSync(name);
    return stat.isDirectory() && _isAJsFileWithExtension(name + '/index.js');
  } catch(e) {
    return undefined;
  }
}

function _isAJsFile(name) /* t:string? */ {
  try {
    return _isAJsFileWithoutExtension(name) || _isAJsFileWithExtension(name);
  } catch(e) {
    return undefined;
  }
}

function _isAJsFileWithoutExtension(name) /* t:string? */ {
  try {
    let stat = fs.lstatSync(name + '.js');
    return stat.isFile() && name + '.js';
  } catch(e) {
    return undefined;
  }
}

function _isAJsFileWithExtension(name) /* t:string? */ {
  try {
    let stat = fs.lstatSync(name);
    return stat.isFile() && name;
  } catch(e) {
    return undefined;
  }
}