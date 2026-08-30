export const safeIncludes = (value: unknown, searchString: string) => {
  return typeof value === 'string' && value.includes(searchString);
};
