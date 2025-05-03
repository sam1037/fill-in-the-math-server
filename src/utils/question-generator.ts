import { Question } from '../types/game.types.js';
import {
  blank_difficulty_mapping,
  num_operation_difficulty_mapping,
  operator_difficulty_mapping,
} from '../types/game.dictionary.js';
import { randint, isNumber } from './utils.js';
import { MathSymbol, Difficulty } from '../types/question.enum.js';

function calculate_result(numbers: number[], selectedOperators: MathSymbol[]) {
  // Calculate the result on right hand side
  let result = numbers[0];
  for (let i = 0; i < selectedOperators.length; i++) {
    const op = selectedOperators[i];
    const num = numbers[i + 1];

    switch (op) {
      case MathSymbol.Addition:
        result += num;
        break;
      case MathSymbol.Subtraction:
        result -= num;
        break;
      case MathSymbol.Multiplication:
        result *= num;
        break;
      case MathSymbol.Division:
        result /= num;
        break;
    }
  }
  return result;
}

function generate_number(
  selectedOperators: MathSymbol[],
  numOperations: number
) {
  // Generate numbers to use in the equation
  const numbers: number[] = [];

  for (let i = 0; i < numOperations + 1; i++) {
    // Ensure division operations result in whole numbers
    let new_number = 0;
    if (i > 0 && selectedOperators[i - 1] === MathSymbol.Division) {
      // Find divisors of the previous number
      const divisors = [];
      for (let j = 1; j <= 9; j++) {
        if (numbers[i - 1] % j === 0) {
          divisors.push(j);
        }
      }
      if (divisors.length > 0) {
        const randomDivisor =
          divisors[Math.floor(Math.random() * divisors.length)];
        new_number = randomDivisor;
      } else {
        // If no proper divisors, change the operation
        selectedOperators[i - 1] = MathSymbol.Addition;
        new_number = randint(1, 9);
      }
    } else {
      new_number = randint(1, 9);
    }
    // if contain duplicate, regenerate a number
    const contain_duplicate = numbers.includes(new_number);
    if (contain_duplicate) {
      i--;
      continue;
    }
    numbers.push(new_number);
  }
  const output: [number[], MathSymbol[]] = [numbers, selectedOperators];
  return output;
}
/**
 * generate math question randomly given difficulty
 *
 * @param difficulty - string in [easy, medium, hard]
 * @returns {Question} - Question object with equation array, difficulty, and expected answer
 *
 * Details:
 * Easy: only addition and subtraction, only single digit numbers, 1 blank
 * Medium: only addition, subtraction, single and double digit numbers, at least one double digit number, 1 - 2 blanks
 *          or multiplication and division, single and double digit numbers, 1 blank
 * Hard: must contain multiplication or division, 1 - 2 blanks
 *
 * Example: generateMathQuestion(Difficulty.Easy) => [1, MathSymbol.Addition, MathSymbol.Blank, MathSymbol.Equals, 3]
 * @Remark
 * The equation should not contain any negative numbers (but ok for intermediate results, e.g. ? - 4 + 3 = 1).
 * The equation answer should seat between 0 and 1000.
 * The blank answer must be a number between 0 - 9 and without replacement each other.
 * There should be only 1 blank or 1 number after MathSymbol.EqFuals
 */
export function generateQuestion(difficulty: Difficulty): Question {
  // Generate random operators
  const operators = operator_difficulty_mapping[difficulty];
  const numOperations = num_operation_difficulty_mapping[difficulty];
  let selectedOperators: MathSymbol[] = []; // storing operator only
  const id = Math.random().toString(36).substring(2, 9);

  for (let i = 0; i < numOperations; i++) {
    let randomIndex = randint(operators.length - 1);

    const include_mul_div = selectedOperators.includes(
      // eslint-disable-next-line  @typescript-eslint/no-unnecessary-condition
      MathSymbol.Multiplication || MathSymbol.Division
    );
    if (include_mul_div) {
      randomIndex = randint(0, 1);
      // if there is mul/div -> remaining operator will be add/subtraction
    }

    if (difficulty == Difficulty.MEDIUM && include_mul_div) {
      // algorithm: for medium, only 1 operator if multiplication is allowed
      break;
    }
    if (difficulty == Difficulty.HARD && i == 0) {
      // algorithm: for hard, pick from multiplication and division first
      randomIndex = randint(2, 3);
    }
    // Otherwise: pick from all 4 operators
    selectedOperators.push(operators[randomIndex]);
  }

  const include_mul_div: boolean =
    selectedOperators.includes(MathSymbol.Multiplication) ||
    selectedOperators.includes(MathSymbol.Division);

  // Generate numbers to use in the equation
  let numbers: number[] = [];
  let generation_result = generate_number(selectedOperators, numOperations);
  numbers = generation_result[0];
  selectedOperators = generation_result[1];
  // Calculate the result on right hand side
  let result = calculate_result(numbers, selectedOperators);

  // Regenerate questions if
  // 1. Numbers contain numbers other than number in [1, 9]
  let contain_pos_1_digit_only = numbers.every((el) => el >= 1 && el <= 9);
  // TODO: modify here: disallow case where result >= 10
  while (!Number.isInteger(result) || !contain_pos_1_digit_only) {
    generation_result = generate_number(selectedOperators, numOperations);
    numbers = generation_result[0];
    selectedOperators = generation_result[1];
    result = calculate_result(numbers, selectedOperators);
    contain_pos_1_digit_only = numbers.every((el) => el >= 1 && el <= 9);
  }
  // Create the equation array
  const equation_arr: (number | MathSymbol)[] = [numbers[0]];
  for (let i = 0; i < selectedOperators.length; i++) {
    equation_arr.push(selectedOperators[i]);
    equation_arr.push(numbers[i + 1]);
  } // num, operator, num, operator
  equation_arr.push(MathSymbol.Equals);
  equation_arr.push(result);

  // Decide how many blanks to create
  // Easy: 1 blank
  // Medium: only addition, subtraction, single and double digit numbers, at least one double digit number, 1 - 2 blanks
  //         or multiplication and division, single and double digit numbers, 1 blank
  // Hard: 1 - 2 blanks
  let numBlanks = blank_difficulty_mapping[difficulty];

  if (difficulty == Difficulty.MEDIUM && include_mul_div) {
    // override for medium to 1 if multiplication/division case
    numBlanks = 1;
  }

  // Create blanks array with positions and values
  const allPositions = [];
  const answer: number[] = [];

  // Collect all possible positions for blanks (each single digit in the equation)
  let pos = 0;

  for (const char of equation_arr) {
    if (isNumber(char) && pos != equation_arr.length - 1) {
      // if is number: add a valid position
      allPositions.push(pos);
    }
    pos++;
  }

  // Randomly select positions for blanks
  const selectedBlankPositions = [];
  for (let i = 0; i < numBlanks; i++) {
    if (difficulty == Difficulty.MEDIUM && include_mul_div && i >= 1)
      // if medium and mul div -> only 1 blank
      break;
    if (allPositions.length > 0) {
      const chosenIndex = randint(allPositions.length - 1);
      const position_index = allPositions[chosenIndex];
      selectedBlankPositions.push(position_index);
      // Store the answer value (the number that will be replaced with a blank)
      answer.push(equation_arr[position_index] as number);
      // Replace the number with a blank in the equation
      equation_arr[position_index] = MathSymbol.Blank;
      allPositions.splice(chosenIndex, 1);
    }
  }

  return {
    id,
    equation_arr,
    difficulty,
  };
}
