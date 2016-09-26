import { readFileSync } from './fsWrapper';
import { parser } from '../../parser'
import { typeChecker } from '../../typeChecker';

export function readFile(fileName /* t:string */) /* t:{ ast: ast, errors: [TypeDocError] } */ {
  const fileContents = readFileSync(fileName);
  const statements = parser.parse(fileContents);

  // Filter imports
  const imports = statements.filter((statement) => statement.name === 'import');
  const importResults = imports.map((anImport) => readFile(anImport.from.replace(/['"]/g, '')));
  const asts = importResults
    .map((importResult) => importResult.ast);

  let errors = importResults
    .map((importResult) => importResult.errors)
    .reduce((a, b) => a.concat(b), []);
  const exportedStatements = _filterExportsFromAsts(asts);

  // Now we have the exported statements, so add that to the current statements and run the typechecker on it.
  const allStatements = exportedStatements.concat(statements.filter((statement) => statement.name !== 'import'));
  errors = errors.concat(typeChecker(allStatements));

  return {
    ast: allStatements,
    errors: errors
  };
}

function _filterExportsFromAsts(asts /* t:[Object] */) {
  return asts.map((ast) => {
      return ast
        .filter((statement) => statement.name === 'export')
        .map((exportStatement) => exportStatement.val);
    })
    .reduce((a, b) => a.concat(b), []);
}
