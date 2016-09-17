import { Parser } from 'jison';

export const grammar = {
  "lex": {
    rules: [
      ["\\s+", "/* skip whitespace */"],
      ['\\//[^\\n]*', '/* skip newline comments */'],
      ['var|let|const', 'return "DECLARATION";'],
      ['class', 'return "CLASS_DECLARATION";'],
      ['new', 'return "NEW";'],
      ['function', 'return "FUNCTION";'],
      ['return', 'return "RETURN";'],
      ['\\(', 'return "OPEN_PAREN";'],
      ['\\)', 'return "CLOSE_PAREN";'],
      ['\\{', 'return "OPEN_BRACKET";'],
      ['\\}', 'return "CLOSE_BRACKET";'],
      ['/\\*', 'return "BEGIN_COMMENT";'],
      ['\\*/', 'return "END_COMMENT";'],
      ['=', 'return "EQ";'],
      ['[\\+\\-\\*\\/]', 'return "OPERATOR";'],
      [';', 'return "SEMICOLON";'],
      ['\\.', 'return "PERIOD";'],
      [',', 'return "COMMA";'],
      ['\'[^\']*\'', 'return "STRING";'],
      ['"[^"]"', 'return "STRING";'],
      ['[0-9]+', 'return "NUMBER";'],
      ['t:[a-zA-Z0-9\\_\\$]+', 'return "TYPEDEF";'],
      ['[a-zA-Z0-9\\_\\$]+', 'return "WORD";']
    ]
  },

  "bnf": {
    start: [
      ['statementList', 'return $$ = $1']
    ],
    assignment: [
      ['WORD EQ expr', '$$ = {name: "assignment", var: $1, assignment: $3, line: yylineno}']
    ],
    classInstantiation: [
      ['NEW WORD OPEN_PAREN CLOSE_PAREN', '$$ = {name: "classInstantiation", type: $2, line: yylineno}'],
      ['NEW WORD OPEN_PAREN arguments CLOSE_PAREN', '$$ = {name: "classInstantiation", type: $2, arguments: $3, line: yylineno}']
    ],
    declaration: [
      ['DECLARATION WORD EQ expr', '$$ = {name: "declaration", var: $2, assignment: $4, line: yylineno}'],
      ['DECLARATION WORD type EQ expr', '$$ = {name: "declaration", var: $2, type: $3, assignment: $5, line: yylineno}'],
      ['DECLARATION WORD', '$$ = {name: "declaration", var: $2, line: yylineno}'],
      ['DECLARATION WORD type', '$$ = {name: "declaration", var: $2, type: $3, line: yylineno}']
    ],
    type: [
      ['BEGIN_COMMENT TYPEDEF END_COMMENT', '$$ = $2.substr(2)'],
    ],
    typeDeclaration: [
      ['CLASS_DECLARATION WORD OPEN_BRACKET CLOSE_BRACKET', '$$ = {name: "classDeclaration", arguments: $2, line: yylineno}']
    ],
    arguments: [
      ['WORD', '$$ = [{name: "argument", var: $1, line: yylineno}]'],
      ['constant', '$$ = [{name: "argument", var: $1, line: yylineno}]'],
      ['WORD type', '$$ = [{name: "argument",  var: $1, type: $2, line: yylineno}]'],
      ['WORD COMMA arguments', '$$ = $3; $3.unshift({name: "argument", var: $1, line: yylineno})'],
      ['constant COMMA arguments', '$$ = $3; $3.unshift({name: "argument", var: $1, line: yylineno})'],
      ['WORD type COMMA arguments', '$$ = $4; $4.unshift({name: "argument",  var: $1, type: $2, line: yylineno})']
    ],
    constant: [
      ['STRING', '$$ = {name: "constant", type: "string", val: $1.replace(/(^.)?(.$)?/g, ""), line: yylineno}'],
      ['NUMBER', '$$ = {name: "constant", type: "number", val: $1, line: yylineno}']
    ],
    expr: [
      ['WORD', '$$ = $1'],
      ['function', '$$ = $1'],
      ['functionCall', '$$ = $1'],
      ['classInstantiation', '$$ = $1'],
      ['constant', '$$ = $1']
    ],
    statement: [
      ['declaration', '$$ = $1'],
      ['operator', '$$ = $1'],
      ['expr', '$$ = $1'],
      ['assignment', '$$ = $1'],
      ['typeDeclaration', '$$ = $1'],
      ['RETURN operator', '$$ = {name: "return", val: $2, line: yylineno}'],
      ['RETURN expr', '$$ = {name: "return", val: $2, line: yylineno}']
    ],
    functionCall: [
      ['WORD OPEN_PAREN arguments CLOSE_PAREN', '$$ = {name: "call", val: $1, arguments: $3, line: yylineno}']
    ],
    operator: [
      ['expr OPERATOR operator', '$$ = {name: "operation", left: $1, operator: $2, right: $3, line: yylineno}'],
      ['expr OPERATOR expr', '$$ = {name: "operation", left: $1, operator: $2, right: $3, line: yylineno}']
    ],
    statementList: [
      ['statementList statement SEMICOLON', '$$ = $1; $1.push($2)'],
      ['statementList statement', '$$ = $1; $1.push($2)'],
      ['statement SEMICOLON', '$$ = [$1]'],
      ['statement', '$$ = [$1]'],
    ],
    block: [
      ['OPEN_BRACKET statementList CLOSE_BRACKET',  '$$ = {name: "block", contents: $2, line: yylineno}'],
    ],
    function: [
      ['FUNCTION OPEN_PAREN arguments CLOSE_PAREN block', '$$ = {name: "function", arguments: $3, block: $5, line: yylineno}'],
      ['FUNCTION OPEN_PAREN arguments CLOSE_PAREN type block','$$ = {name: "function", arguments: $3, type: $5, block: $6, line: yylineno}'],
      ['FUNCTION WORD OPEN_PAREN arguments CLOSE_PAREN block','$$ = {name: "function", var: $2, arguments: $4, block: $6, line: yylineno}'],
      ['FUNCTION WORD OPEN_PAREN arguments CLOSE_PAREN type block', '$$ = {name: "function", var: $2, arguments: $4, type: $6, block: $7, line: yylineno}']
    ]
  }
};
