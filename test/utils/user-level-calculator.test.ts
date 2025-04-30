import { calculateLevel } from '../../src/utils/user-level-calculator.js';

describe('User level calculator', () => {
  it('should return a number', () => {
    const experience = 50;
    const level = calculateLevel(experience);
    expect(typeof level).toBe('number');
  });

  it('should calculate the level correctly', () => {
    const expArr = [1, 10, 100, 1000, 10000];
    const levelsArr = [1, 1, 2, 2, 3];

    expArr.forEach((exp, index) => {
      const calculatedLevel = calculateLevel(exp);
      expect(calculatedLevel).toBe(levelsArr[index]);
    });
  });
});
