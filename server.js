const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'static')));

// ─────────────────────────── core compiler ───────────────────────────

class ASTNode {
  constructor(nodeType, value = null, children = []) {
    this.type = nodeType;
    this.value = value;
    this.children = children;
  }

  toDict() {
    let val = this.value;
    if (Array.isArray(val)) {
      val = val.join(' ');
    }
    return {
      type: this.type,
      value: val,
      children: this.children.map(c => c instanceof ASTNode ? c.toDict() : c),
    };
  }
}

function tokenize(text) {
  text = text.toLowerCase();
  const tokens = text.match(/[a-z]+|\d+/g) || [];
  return tokens;
}

const KEYWORDS = new Set([
  'create', 'declare', 'let', 'make', 'set', 'assign', 'update', 'evaluate',
  'print', 'show', 'display', 'output', 'to', 'with', 'value', 'be', 'plus',
  'minus', 'times', 'divide', 'modulo', 'mod', 'power', 'variable', 'if',
  'while', 'end', 'greater', 'less', 'equal', 'equals', 'not', 'than', 'is',
]);

const OPERATORS = {
  'plus': '+', 'minus': '-', 'times': '*', 'divide': '/',
  'modulo': '%', 'mod': '%', 'power': '**', 'pow': '**',
};

const COMPS = { 'greater': '>', 'less': '<', 'equal': '==', 'equals': '==', 'not': '!=' };

function parseCondition(tokens, i) {
  const fluff = new Set(['is', 'than', 'to', 'be', 'the']);
  let left = null, comp = null, right = null;

  while (i < tokens.length) {
    const t = tokens[i];
    if (['set', 'assign', 'print', 'show', 'if', 'while', 'end', 'declare', 'create'].includes(t)) break;

    if (['greater', 'less', 'equal', 'equals', 'not'].includes(t)) {
      if (t === 'not' && i + 1 < tokens.length && tokens[i + 1] === 'equal') {
        comp = 'not';
        i++;
      } else {
        comp = t;
      }
    } else if (/^\d+$/.test(t)) {
      if (left === null) left = t;
      else if (right === null) right = t;
    } else if (!fluff.has(t) && !KEYWORDS.has(t)) {
      if (left === null) left = t;
      else if (right === null) right = t;
    }

    if (left && comp && right) {
      i++;
      break;
    }
    if (left && right && i + 1 < tokens.length && ['set', 'assign', 'print', 'show', 'if', 'while', 'end', 'declare', 'create'].includes(tokens[i + 1])) {
      i++;
      break;
    }
    i++;
  }

  return { left, comp, right, i };
}

function parseBlock(tokens, i, stop1, stop2) {
  const ast = [];

  try {
    while (i < tokens.length) {
      if (stop1 && tokens[i] === stop1) {
        if (stop2) {
          if (i + 1 < tokens.length && tokens[i + 1] === stop2) {
            i += 2;
            break;
          }
        } else {
          i++;
          break;
        }
      }

      const t = tokens[i];

      if (['create', 'declare', 'let', 'make'].includes(t)) {
        const fluff = new Set(['variable', 'a', 'an', 'with', 'value', 'of', 'be', 'to', 'is', 'equal', 'equals']);
        let varName = null, val = null;
        i++;

        while (i < tokens.length) {
          if (stop1 && tokens[i] === stop1) break;
          if (['set', 'assign', 'print', 'show', 'if', 'while', 'end', 'declare', 'create'].includes(tokens[i])) break;

          if (/^\d+$/.test(tokens[i])) {
            val = parseInt(tokens[i]);
            i++;
            break;
          } else if (!fluff.has(tokens[i]) && !KEYWORDS.has(tokens[i])) {
            if (varName === null) varName = tokens[i];
          }
          i++;
        }

        if (varName !== null && val !== null) {
          ast.push(new ASTNode('declare', varName, [val]));
        }

      } else if (['set', 'assign', 'update', 'evaluate'].includes(t)) {
        const fluff = new Set(['variable', 'to', 'with', 'value', 'of', 'equal', 'equals', 'is', 'as']);
        let varName = null, left = null, op = null, right = null;
        i++;

        while (i < tokens.length) {
          if (stop1 && tokens[i] === stop1) break;
          if (['set', 'assign', 'print', 'show', 'if', 'while', 'end', 'declare', 'create'].includes(tokens[i])) break;

          if (['plus', 'minus', 'times', 'divide', 'modulo', 'mod', 'power'].includes(tokens[i])) {
            op = tokens[i];
          } else if (/^\d+$/.test(tokens[i])) {
            if (left === null) left = tokens[i];
            else if (right === null) right = tokens[i];
          } else if (!fluff.has(tokens[i]) && !KEYWORDS.has(tokens[i])) {
            if (varName === null) varName = tokens[i];
            else if (left === null) left = tokens[i];
            else if (right === null) right = tokens[i];
          }

          if (varName && left && op && right) {
            i++;
            break;
          }
          i++;
        }

        if (varName && left) {
          if (op && right) {
            ast.push(new ASTNode('assign', varName, [left, op, right]));
          } else {
            ast.push(new ASTNode('declare', varName, [left]));
          }
        }

      } else if (['print', 'show', 'display', 'output'].includes(t)) {
        const fluff = new Set(['the', 'value', 'of', 'variable']);
        let varName = null;
        i++;

        while (i < tokens.length) {
          if (stop1 && tokens[i] === stop1) break;
          if (['set', 'assign', 'print', 'show', 'if', 'while', 'end', 'declare', 'create'].includes(tokens[i])) break;

          if (!fluff.has(tokens[i]) && !KEYWORDS.has(tokens[i])) {
            varName = tokens[i];
            i++;
            break;
          }
          i++;
        }

        if (varName) {
          ast.push(new ASTNode('print', varName));
        }

      } else if (t === 'if') {
        const { left, comp, right, i: newI } = parseCondition(tokens, i + 1);
        const { ast: blockAst, i: blockI } = parseBlockWrapper(tokens, newI, 'end', 'if');
        if (left && right) {
          ast.push(new ASTNode('if', [left, comp || 'equal', right], blockAst));
        }
        i = blockI;

      } else if (t === 'while') {
        const { left, comp, right, i: newI } = parseCondition(tokens, i + 1);
        const { ast: blockAst, i: blockI } = parseBlockWrapper(tokens, newI, 'end', 'while');
        if (left && right) {
          ast.push(new ASTNode('while', [left, comp || 'equal', right], blockAst));
        }
        i = blockI;

      } else {
        i++;
      }
    }
  } catch (e) {
    throw new Error(`Parsing error: ${e.message}`);
  }

  return { ast, i };
}

function parseBlockWrapper(tokens, i, stop1, stop2) {
  const { ast, i: newI } = parseBlock(tokens, i, stop1, stop2);
  return { ast, i: newI };
}

function parse(tokens) {
  const { ast } = parseBlock(tokens, 0, null, null);
  return ast;
}

function generateCode(ast, indent = 0) {
  const code = [];
  const prefix = '    '.repeat(indent);

  for (const node of ast) {
    if (node.type === 'declare') {
      code.push(`${prefix}int ${node.value} = ${node.children[0]};`);
    } else if (node.type === 'assign') {
      const [l, o, r] = node.children;
      const opSym = OPERATORS[o] || '+';
      code.push(`${prefix}${node.value} = ${l} ${opSym} ${r};`);
    } else if (node.type === 'print') {
      code.push(`${prefix}cout << ${node.value} << endl;`);
    } else if (node.type === 'if') {
      const [l, c, r] = node.value;
      let compSym = COMPS[c] || '==';
      if (c === 'not') compSym = '!=';
      code.push(`${prefix}if (${l} ${compSym} ${r}) {`);
      const blockCode = generateCode(node.children, indent + 1);
      code.push(blockCode);
      code.push(`${prefix}}`);
    } else if (node.type === 'while') {
      const [l, c, r] = node.value;
      let compSym = COMPS[c] || '==';
      if (c === 'not') compSym = '!=';
      code.push(`${prefix}while (${l} ${compSym} ${r}) {`);
      const blockCode = generateCode(node.children, indent + 1);
      code.push(blockCode);
      code.push(`${prefix}}`);
    }
  }

  return code.join('\n');
}

function generateCppFile(ast) {
  const includes = '#include <iostream>\nusing namespace std;\n\nint main() {\n';
  const body = generateCode(ast, 1);
  const closing = '\n    return 0;\n}';
  return includes + body + closing;
}

class TACGenerator {
  constructor() {
    this.tacLines = [];
    this.tempCount = 0;
    this.labelCount = 0;
  }

  newTemp() {
    this.tempCount++;
    return `t${this.tempCount}`;
  }

  newLabel() {
    this.labelCount++;
    return `L${this.labelCount}`;
  }

  generate(ast) {
    for (const node of ast) {
      if (node.type === 'declare') {
        this.tacLines.push(`${node.value} = ${node.children[0]}`);
      } else if (node.type === 'assign') {
        const [l, o, r] = node.children;
        const opSym = OPERATORS[o] || '+';
        const temp = this.newTemp();
        this.tacLines.push(`${temp} = ${l} ${opSym} ${r}`);
        this.tacLines.push(`${node.value} = ${temp}`);
      } else if (node.type === 'print') {
        this.tacLines.push(`print ${node.value}`);
      } else if (node.type === 'if') {
        const [l, c, r] = node.value;
        let compSym = COMPS[c] || '==';
        if (c === 'not') compSym = '!=';
        const temp = this.newTemp();
        this.tacLines.push(`${temp} = ${l} ${compSym} ${r}`);
        const lEnd = this.newLabel();
        this.tacLines.push(`ifFalse ${temp} goto ${lEnd}`);
        this.generate(node.children);
        this.tacLines.push(`${lEnd}:`);
      } else if (node.type === 'while') {
        const [l, c, r] = node.value;
        let compSym = COMPS[c] || '==';
        if (c === 'not') compSym = '!=';
        const lStart = this.newLabel();
        const lEnd = this.newLabel();
        this.tacLines.push(`${lStart}:`);
        const temp = this.newTemp();
        this.tacLines.push(`${temp} = ${l} ${compSym} ${r}`);
        this.tacLines.push(`ifFalse ${temp} goto ${lEnd}`);
        this.generate(node.children);
        this.tacLines.push(`goto ${lStart}`);
        this.tacLines.push(`${lEnd}:`);
      }
    }
    return this.tacLines;
  }
}

function generateDAG(tacLines) {
  const dagNodes = [];

  for (const line of tacLines) {
    if (line.includes('=') && !line.includes('ifFalse')) {
      const parts = line.split('=');
      const varName = parts[0].trim();
      const expr = parts.slice(1).join('=').trim();
      dagNodes.push({
        node: varName,
        dependency: expr,
        type: varName.startsWith('t') ? 'compute' : 'store',
      });
    } else if (line.includes('ifFalse')) {
      dagNodes.push({ node: 'Branch', dependency: line, type: 'control' });
    } else if (line.endsWith(':')) {
      dagNodes.push({ node: 'Block', dependency: line, type: 'label' });
    } else if (line.startsWith('goto')) {
      dagNodes.push({ node: 'Jump', dependency: line, type: 'control' });
    } else if (line.startsWith('print ')) {
      dagNodes.push({ node: 'Print', dependency: line, type: 'io' });
    }
  }

  return dagNodes;
}

// ─────────────────────────── Express routes ───────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.post('/compile', (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    if (!req.body || typeof req.body.source !== 'string') {
      return res.status(400).json({ error: 'Invalid request: source must be a string' });
    }

    const source = req.body.source.trim();

    if (!source) {
      return res.status(400).json({ error: 'Empty input' });
    }

    const tokens = tokenize(source);
    const ast = parse(tokens);
    const astDicts = ast.map(n => n.toDict());

    const tacGen = new TACGenerator();
    const tac = tacGen.generate(ast);
    const dag = generateDAG(tac);

    const code = generateCppFile(ast);

    res.json({
      tokens,
      ast: astDicts,
      tac,
      dag,
      code,
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});