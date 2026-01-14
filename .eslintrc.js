module.exports = {
  extends: [
    'expo',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    // Allow console.error but warn on console.log
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    // React Native specific
    'react-native/no-inline-styles': 'off', // Allow inline styles for now
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    // General code quality
    'prefer-const': 'warn',
    'no-var': 'error',
    // Allow empty arrow functions
    '@typescript-eslint/no-empty-function': 'off',
  },
  env: {
    'react-native/react-native': true,
  },
};
