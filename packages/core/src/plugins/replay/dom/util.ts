export const getInjectStyleRules: (blockClass: string) => string[] = (blockClass: string) => [
  `.${blockClass} { background: currentColor }`,
  'noscript { display: none !important; }',
];
