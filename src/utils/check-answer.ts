import { MathSymbol } from '../types/game.types.js';
import { isNumber } from './utils.js';

/**
 * Checks if the provided answer is correct for the given equation.
 *
 * @param equation_arr The equation array from the question
 * @param answer The user's answer as an array of numbers
 * @returns boolean indicating if the answer is correct
 */
export function checkAnswer(
  equation_arr: (number | MathSymbol)[],
  answer: number[]
): boolean {
  if (answer.length === 0) {
    return false;
  }

  // Create a copy of the equation with blanks filled in
  const filledEquation = [...equation_arr];
  let answerIndex = 0;

  // Fill in the blanks with the provided answers
  for (let i = 0; i < filledEquation.length; i++) {
    if (filledEquation[i] === MathSymbol.Blank) {
      if (answerIndex >= answer.length) {
        return false; // Not enough answers provided
      }
      filledEquation[i] = answer[answerIndex++];
    }
  }

  // Evaluate the filled equation
  return evaluateEquation(filledEquation);
}

/**
 * Evaluates if the equation is mathematically correct.
 *
 * @param equation The filled equation array
 * @returns boolean indicating if the equation is valid
 */
function evaluateEquation(equation: (number | MathSymbol)[]): boolean {
  // Find the position of the equals sign
  const equalsIndex = equation.indexOf(MathSymbol.Equals);
  if (equalsIndex === -1) {
    return false; // No equals sign found
  }

  // Split into left and right sides
  const leftSide = equation.slice(0, equalsIndex);
  const rightSide = equation.slice(equalsIndex + 1);

  // Calculate the value of the left side
  const leftValue = calculateExpression(leftSide);

  // Calculate the value of the right side
  const rightValue = calculateExpression(rightSide);

  // Compare the values
  return leftValue === rightValue;
}

/**
 * Calculates the value of a mathematical expression following order of operations.
 *
 * @param expression The expression to evaluate
 * @returns The calculated value
 */
function calculateExpression(expression: (number | MathSymbol)[]): number {
  if (expression.length === 0) return 0;
  if (expression.length === 1 && isNumber(expression[0])) {
    return expression[0] as number;
  }

  // Convert infix notation to a more easily computable format
  const values: number[] = [];
  const operators: MathSymbol[] = [];

  for (const token of expression) {
    if (isNumber(token)) {
      values.push(token as number);
    } else if (
      token === MathSymbol.Addition ||
      token === MathSymbol.Subtraction ||
      token === MathSymbol.Multiplication ||
      token === MathSymbol.Division
    ) {
      // Process operators according to precedence
      while (
        operators.length > 0 &&
        hasPrecedence(token as MathSymbol, operators[operators.length - 1])
      ) {
        values.push(
          applyOperator(operators.pop()!, values.pop()!, values.pop()!)
        );
      }
      operators.push(token as MathSymbol);
    }
  }

  // Process any remaining operators
  while (operators.length > 0) {
    values.push(applyOperator(operators.pop()!, values.pop()!, values.pop()!));
  }

  return values[0];
}

/**
 * Determines if op2 has higher or equal precedence compared to op1.
 */
function hasPrecedence(op1: MathSymbol, op2: MathSymbol): boolean {
  if (
    (op2 === MathSymbol.Multiplication || op2 === MathSymbol.Division) &&
    (op1 === MathSymbol.Addition || op1 === MathSymbol.Subtraction)
  ) {
    return true;
  }
  return false;
}

/**
 * Applies a binary operator to two operands.
 */
function applyOperator(operator: MathSymbol, b: number, a: number): number {
  switch (operator) {
    case MathSymbol.Addition:
      return a + b;
    case MathSymbol.Subtraction:
      return a - b;
    case MathSymbol.Multiplication:
      return a * b;
    case MathSymbol.Division:
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
