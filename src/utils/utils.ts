export function randint(min: number, max = NaN) {
  if (Number.isNaN(max)) {
    // if only one integer as input, set max = input and min = 0
    max = min;
    min = 0;
  }
  // return output in range [min, max] inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const isNumber = (val: any) => typeof val === 'number' && val === val; // check for type and NaN
