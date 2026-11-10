import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  { rules: { 'no-console': 'error' } },
)
