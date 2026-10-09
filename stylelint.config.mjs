export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['node_modules/**', 'miniprogram_npm/**'],
  rules: {
    'custom-property-empty-line-before': null,
    'media-feature-range-notation': null,
    'selector-class-pattern': null,
    'selector-type-no-unknown': [
      true,
      {
        ignoreTypes: ['page', 'view', 'text', 'scroll-view', 'button', 'image', 'input'],
      },
    ],
    'unit-no-unknown': [true, { ignoreUnits: ['rpx'] }],
  },
  overrides: [
    {
      files: ['miniprogram/components/navigation-bar/navigation-bar.scss'],
      rules: {
        'alpha-value-notation': null,
        'color-function-alias-notation': null,
        'color-function-notation': null,
        'custom-property-pattern': null,
        'property-no-vendor-prefix': null,
        'rule-empty-line-before': null,
      },
    },
  ],
}
