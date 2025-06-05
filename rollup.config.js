import path from 'path';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension';
import copy from 'rollup-plugin-copy';
import {emptyDir} from "rollup-plugin-empty-dir";

/**
 *
 * @param args Run with --config-verbose to run a diagnostic build
 */
export default (args) => {
  console.log(args)
  const commonPlugins = [
    replace({
      preventAssignment: true,
      values: {
        '__log_namespace__': JSON.stringify('AuRo ::'),
        '__log_verbose__': args?.profile === 'verbose' ?? false,
      }
    }),
    nodeResolve(),
  ];

  return [
    {
      input: `./src/manifest.chrome.json`,
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
        emptyDir(),
        chromeExtension(),
        simpleReloader(),
        ...commonPlugins,
        copy({
          targets: [
            { src: 'src/Icon128-white.png', dest: 'dist.chrome' }
          ]
        })
      ],
    },
    {
      input: `./src/manifest.firefox.json`,
      output: {
        dir: 'dist.firefox',
        format: 'es',
        globals: [ 'chrome' ]
      },
      treeshake: false,
      plugins: [
        emptyDir(),
        chromeExtension(),
        simpleReloader(),
        ...commonPlugins,
        copy({
          targets: [
            { src: 'src/Icon128-white.png', dest: 'dist.firefox' }
          ]
        })
      ],
    },
    {
      input: './src/background/library.js',
      output: {
        file: 'dist.chrome/lib.js',
        format: 'umd',
        name: 'auro',
      },
      plugins: [
        ...commonPlugins,
      ],
    },
    {
      input: './src/background/library.js',
      output: {
        file: 'dist.firefox/lib.js',
        format: 'umd',
        name: 'auro',
      },
      plugins: [
        ...commonPlugins,
      ],
    },
  ];
};
