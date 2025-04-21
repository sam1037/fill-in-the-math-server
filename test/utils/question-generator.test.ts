import { generateQuestion } from '../../src/utils/question-generator.js';
import { Difficulty, MathSymbol } from '../../src/types/question.enum.js';

describe('Question generator', () => {
  it('should generate an easy question', () => {
    const question = generateQuestion(Difficulty.EASY);
    expect(question.difficulty).toBe(Difficulty.EASY);
    expect(
      question.equation_arr.filter((item) => item === MathSymbol.Blank).length
    ).toBe(1);
  });

  it('should generate a medium question', () => {
    const question = generateQuestion(Difficulty.MEDIUM);
    expect(question.difficulty).toBe(Difficulty.MEDIUM);
    const blankCount = question.equation_arr.filter(
      (item) => item === MathSymbol.Blank
    ).length;
    expect(blankCount).toBeGreaterThanOrEqual(1);
    expect(blankCount).toBeLessThanOrEqual(2);
  });

  it('should generate a hard question', () => {
    const question = generateQuestion(Difficulty.HARD);
    expect(question.difficulty).toBe(Difficulty.HARD);
    const blankCount = question.equation_arr.filter(
      (item) => item === MathSymbol.Blank
    ).length;
    expect(blankCount).toBeGreaterThanOrEqual(1);
    expect(blankCount).toBeLessThanOrEqual(2);

    const hasMultiplication = question.equation_arr.includes(
      MathSymbol.Multiplication
    );
    const hasDivision = question.equation_arr.includes(MathSymbol.Division);
    expect(hasMultiplication || hasDivision).toBe(true);
  });
});
