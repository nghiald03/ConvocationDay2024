export const safeIncludes = (value: any, searchString: string) => {
  return typeof value === 'string' && value.includes(searchString);
};
