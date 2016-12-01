import { readFileSync } from './fsWrapper';
import { parser } from '../../parser';
import { typeChecker } from '../../typeChecker';
import { File } from './file';

export function readFile(fileName /* t:String */) /* t:{ ast: ast, errors: [TypeDocError] } */ {
  const fileContents = readFileSync(fileName);
  const statements = parser.parse(fileContents);
  let currentDirectory = fileName.split('/');

  // Filter imports
  const imports = statements.filter((statement) => statement.name === 'import');
  const importedFiles = imports.map((anImport) => {
    currentDirectory.pop();
    currentDirectory.push(anImport.from.replace(/['"]/g, ''));
    return readFile(currentDirectory.join('/'));
  });
  const asts = importedFiles
    .map((importedFile) => importedFile.ast);

  let exportedStatements = _filterExportsFromAsts(asts);
  exportedStatements = _mapImportAliases(exportedStatements, imports);

  // Now we have the exported statements, so add that to the current statements and run the typechecker on it.
  const allStatements = exportedStatements.concat(statements.filter((statement) => statement.name !== 'import'));
  const errors = typeChecker(allStatements);

  return new File(fileName, allStatements, errors, importedFiles);
}

function _filterExportsFromAsts(asts /* t:[Object] */) {
  return asts.map((ast) => {
      return ast
        .filter((statement) => statement.name === 'export')
        .map((exportStatement) => exportStatement.val);
    })
    .reduce((a, b) => a.concat(b), []);
}

function _mapImportAliases(asts /* t:[Object] */, imports /* t:[Object] */) {
  imports
    .forEach((anImportStatement) => {
      anImportStatement
        .imports
        .filter((anImport) => Boolean(anImport.exportName))
        .forEach((anImport) => {
          const importDeclaration = asts
            .find((statement) => {
              return statement.name === 'declaration' &&
                statement.var === anImport.exportName;
            });
          importDeclaration.var = anImport.var;
        });
    });

  return asts;
}
