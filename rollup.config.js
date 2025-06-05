import path from 'path';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension';
import copy from 'rollup-plugin-copy2';
import {emptyDir} from "rollup-plugin-empty-dir";
import zip from "rollup-plugin-zip";

/**
 *
 * @param args Run with --config-verbose to run a diagnostic build
 */
export default (args) => {
  console.log(args)
  function plugins(build) {
    return [
      replace({
        preventAssignment: true,
        values: {
          '__log_namespace__': JSON.stringify('AuRo ::'),
          '__log_verbose__': args?.profile === 'verbose' ?? false,
        }
      }),
      nodeResolve(),
      ...(build ? [
        emptyDir(),
        copy({
          assets: [
            ['src/Icon128-white.png', `Icon128-white.png`],
            ['dist.content/lib.js', `lib.js`],
          ],
        }),
        chromeExtension(),
        simpleReloader()
      ] : [])
    ];
  }

  return [
    {
      input: './src/background/library.js',
      output: {
        file: 'dist.content/lib.js',
        format: 'umd',
        name: 'auro',
      },
      plugins: plugins(),
    },
    {
      input: `./src/manifest.chrome.json`,
      cache: true,
      output: {
        dir: 'dist.chrome',
        format: 'es',
        globals: [ 'chrome' ],
        // HACK: Bypass a bug in chromeExtension() with chunk generation on Windows.
        // https://github.com/crxjs/chrome-extension-tools/issues/111
        chunkFileNames: path.join('chunks', '[name]-[hash].js'),
      },
      treeshake: false,
      plugins: [
        ...plugins('chrome'),
        zip(),
      ],
    },
    {
      input: `./src/manifest.firefox.json`,
      cache: true,
      output: {
        dir: 'dist.firefox',
        format: 'es',
        globals: [ 'chrome' ],
        // HACK: Bypass a bug in chromeExtension() with chunk generation on Windows.
        // https://github.com/crxjs/chrome-extension-tools/issues/111
        chunkFileNames: path.join('chunks', '[name]-[hash].js'),
      },
      treeshake: false,
      plugins: [
        ...plugins('firefox'),
        zip()
      ],
    }
  ];
};
