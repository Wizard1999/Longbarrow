import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// The sim-purity rule (06_phase1_kickoff.md §3). A rule that fails the build is
// worth more than a comment asking people to be careful: this is the single
// thing that decides whether Phase 4.3 lockstep multiplayer is a feature or a
// rewrite.
const simPurity = {
  files: ['src/sim/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'three', message: 'sim/ must not import three — see 06 §3.' },
      ],
      patterns: [
        {
          group: ['**/render/**', '**/input/**', '**/ui/**', 'three/*'],
          message: 'sim/ must not depend on presentation or input — see 06 §3.',
        },
      ],
    }],
    'no-restricted-globals': ['error',
      { name: 'window', message: 'sim/ must not touch the DOM — see 06 §3.' },
      { name: 'document', message: 'sim/ must not touch the DOM — see 06 §3.' },
      { name: 'performance', message: 'sim/ must not read wall-clock time; durations are in ticks — see 06 §3.' },
      { name: 'requestAnimationFrame', message: 'sim/ must not drive itself from the render loop — see 06 §3.' },
      { name: 'localStorage', message: 'sim/ must not touch browser storage — see 06 §3.' },
    ],
    'no-restricted-properties': ['error',
      { object: 'Math', property: 'random', message: 'sim/ must use the seeded PRNG in core/rng.ts — see 06 §3.' },
      { object: 'Date', property: 'now', message: 'sim/ must not read wall-clock time; durations are in ticks — see 06 §3.' },
    ],
    'no-restricted-syntax': ['error',
      {
        selector: "NewExpression[callee.name='Date']",
        message: 'sim/ must not read wall-clock time; durations are in ticks — see 06 §3.',
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '**/*.html', '*_files'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  simPurity,
);
