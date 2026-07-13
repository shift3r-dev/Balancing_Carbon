export type FormulaVariables = Record<string, number>;

type Token = { type: 'number' | 'identifier' | 'operator' | 'paren'; value: string };

function tokens(input: string): Token[] {
  const result: Token[] = []; let index = 0;
  while (index < input.length) {
    const rest = input.slice(index); const whitespace = rest.match(/^\s+/); if (whitespace) { index += whitespace[0].length; continue; }
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/); if (number) { result.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/); if (identifier) { result.push({ type: 'identifier', value: identifier[0] }); index += identifier[0].length; continue; }
    const character = rest[0]; if ('+-*/'.includes(character)) result.push({ type: 'operator', value: character }); else if ('()'.includes(character)) result.push({ type: 'paren', value: character }); else throw new Error(`Unsupported formula token at position ${index}.`); index += 1;
  }
  if (result.length > 100) throw new Error('Formula is too complex.'); return result;
}

export function evaluateAnalyticsFormula(expression: string, variables: FormulaVariables) {
  const input = tokens(expression); let cursor = 0;
  const peek = () => input[cursor]; const take = () => input[cursor++];
  const primary = (): number => { const token = take(); if (!token) throw new Error('Formula ended unexpectedly.'); if (token.type === 'number') return Number(token.value); if (token.type === 'identifier') { if (!Object.prototype.hasOwnProperty.call(variables, token.value)) throw new Error(`Unknown KPI variable: ${token.value}.`); return Number(variables[token.value]); } if (token.type === 'operator' && token.value === '-') return -primary(); if (token.type === 'paren' && token.value === '(') { const value = additive(); const close = take(); if (close?.value !== ')') throw new Error('Missing closing parenthesis.'); return value; } throw new Error(`Unexpected formula token: ${token.value}.`); };
  const multiplicative = (): number => { let value = primary(); while (peek()?.type === 'operator' && ['*','/'].includes(peek().value)) { const operator = take().value, right = primary(); value = operator === '*' ? value * right : right === 0 ? 0 : value / right; } return value; };
  const additive = (): number => { let value = multiplicative(); while (peek()?.type === 'operator' && ['+','-'].includes(peek().value)) { const operator = take().value, right = multiplicative(); value = operator === '+' ? value + right : value - right; } return value; };
  const value = additive(); if (cursor !== input.length) throw new Error(`Unexpected formula token: ${peek()?.value}.`); if (!Number.isFinite(value)) return 0; return value;
}
