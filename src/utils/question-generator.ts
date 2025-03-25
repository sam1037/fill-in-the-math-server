import { Question, QuestionDifficulty } from '../types/game.types.js';

// Generate a math question based on difficulty
export const generateQuestion = (difficulty: QuestionDifficulty): Question => {
  let num1, num2, operation;
  const id = Math.random().toString(36).substring(2, 9);

  switch (difficulty) {
    case QuestionDifficulty.EASY:
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      operation = Math.floor(Math.random() * 2); // + or -
      break;
    case QuestionDifficulty.MEDIUM:
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      operation = Math.floor(Math.random() * 3); // +, -, or *
      break;
    case QuestionDifficulty.HARD:
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      operation = Math.floor(Math.random() * 4); // +, -, *, or /
      if (operation === 3) {
        // Ensure division results in an integer
        num1 = num2 * (Math.floor(Math.random() * 10) + 1);
      }
      break;
  }

  let text = '';
  let answer = 0;

  switch (operation) {
    case 0: // Addition
      text = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
    case 1: // Subtraction
      if (num1 < num2) [num1, num2] = [num2, num1]; // Ensure positive result
      text = `${num1} - ${num2}`;
      answer = num1 - num2;
      break;
    case 2: // Multiplication
      text = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
    case 3: // Division
      text = `${num1} ÷ ${num2}`;
      answer = num1 / num2;
      break;
  }

  return {
    id,
    text,
    answer,
    difficulty,
  };
};
