import { MathSymbol } from './question.enum.js';
import { randint } from '../utils/utils.js';

export const blank_difficulty_mapping = {
  easy: 1,
  medium: randint(1, 2),
  hard: randint(1, 2),
};

export const num_operation_difficulty_mapping = {
  easy: 1,
  medium: randint(1, 2),
  hard: randint(1, 2),
};

/**
 * Mapping of difficulty levels to the allowed math operators.
 *
 * - **Easy**: Only addition and subtraction operations. Uses single digit numbers with 1 blank.
 * - **Medium**:
 *   - Addition and subtraction with single and double digit numbers (at least one double digit number) and 1-2 blanks.
 *   - OR multiplication and division with single and double digit numbers and 1 blank.
 * - **Hard**: Must contain multiplication or division operations with 1-2 blanks.
 *
 * @remarks
 * This mapping helps generate math problems of appropriate difficulty levels.
 */
export const operator_difficulty_mapping = {
  easy: [MathSymbol.Addition, MathSymbol.Subtraction],
  medium: [
    MathSymbol.Addition,
    MathSymbol.Subtraction,
    MathSymbol.Multiplication,
    MathSymbol.Division,
  ],
  hard: [
    MathSymbol.Addition,
    MathSymbol.Subtraction,
    MathSymbol.Multiplication,
    MathSymbol.Division,
  ],
  // Easy: only addition and subtraction, only single digit numbers, 1 blank
  // Medium: only addition, subtraction, single and double digit numbers, at least one double digit number, 1 - 2 blanks
  //         or multiplication and division, single and double digit numbers, 1 blank
  // Hard: must contain multiplication or division, 1 - 2 blanks
};
