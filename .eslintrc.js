module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
  },
  'extends': [
    'airbnb',
  ],
  'parser': 'babel-eslint',
  'plugins': [
    'import',
    'react',
  ],
  'globals': {
    'html2canvas': false,
    "window": true,
  },
  'rules': {
    'semi': ['error', 'never'],
    'import/no-unresolved': [2, { 'ignore': ['views/.*'] }],
    'react/jsx-filename-extension': 'off',
    'no-underscore-dangle': ['error', { 'allow': ['__'], 'allowAfterThis': true }],
    'import/extensions': ['error', { 'es': 'never' }],
    'import/no-extraneous-dependencies': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'camelcase': 'off',
    'no-confusing-arrow': 'off',
  },
  'settings': {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.jsx', '.es', '.coffee', '.cjsx'],
        'paths': [__dirname],
      },
    },
    'import/core-modules': [
      'electron',
      'react',
      'react-dom',
      'react-redux',
      'redux-observers',
      'reselect',
      'react-bootstrap',
      'react-fontawesome',
      'path-extra',
      'fs-extra',
      'lodash',
      'cson',
      'react-virtualized',
    ],
  },
}
