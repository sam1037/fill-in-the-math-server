import { checkAnswer } from '../../src/utils/check-answer.js';
import { MathSymbol } from '../../src/types/question.enum.js';

describe('checkAnswer', () => {
  it('should return true for a correct answer', () => {
    const equation = [
      1,
      MathSymbol.Addition,
      MathSymbol.Blank,
      MathSymbol.Equals,
      3,
    ];
    const answer = [2];
    expect(checkAnswer(equation, answer)).toBe(true);
  });

  it('should return false for an incorrect answer', () => {
    const equation = [
      1,
      MathSymbol.Addition,
      MathSymbol.Blank,
      MathSymbol.Equals,
      3,
    ];
    const answer = [5];
    expect(checkAnswer(equation, answer)).toBe(false);
  });

  it('should return false if no answer is provided', () => {
    const equation = [
      1,
      MathSymbol.Addition,
      MathSymbol.Blank,
      MathSymbol.Equals,
      3,
    ];
    const answer: number[] = [];
    expect(checkAnswer(equation, answer)).toBe(false);
  });

  it('should handle multiple blanks correctly', () => {
    const equation = [
      MathSymbol.Blank,
      MathSymbol.Addition,
      MathSymbol.Blank,
      MathSymbol.Equals,
      5,
    ];
    const answer = [2, 3];
    expect(checkAnswer(equation, answer)).toBe(true);
  });

  it('should return false if not enough answers are provided', () => {
    const equation = [
      MathSymbol.Blank,
      MathSymbol.Addition,
      MathSymbol.Blank,
      MathSymbol.Equals,
      5,
    ];
    const answer = [2];
    expect(checkAnswer(equation, answer)).toBe(false);
  });
});
