// filepath: src/utils/level-calculator.ts

export const calculateLevel = (experience: number): number => {
  if (experience <= 0) {
    return 1; // Minimum level
  }

  // logarithmic function to calculate level
  const level = Math.floor(Math.log(experience + 1) / (10 * Math.log(1.5))) + 1;

  // Ensure level doesn't exceed a maximum value (e.g., 100)
  const maxLevel = 100;
  return Math.min(level, maxLevel);
};
