/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import esbuildPluginTsc from 'esbuild-plugin-tsc'
// import alias from 'esbuild-plugin-alias'
import fs from 'fs'
import path from 'path'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import { commonjs } from '@hyrious/esbuild-plugin-commonjs'

// Obtain all .ts files in the src directory
const entryPoints = fs
  .readdirSync('src')
  .filter(file => path.extname(file) === '.ts')
  .map(file => path.join('src', file))

export function createBuildSettings(options) {
  const commonSettings = {
    entryPoints,
    bundle: true,
    sourcemap: true,
    plugins: [
      esbuildPluginTsc({
        force: true
      }), commonjs({ filter: /^peculiar/ })
    ],
    ...options
  }

  const doLog = false
  function bannerLog(banner, always = '') {
    if (doLog) {
      return {
        js: banner + always
      }
    } else {
      return always
        ? {
            js: always
          }
        : {}
    }
  }

  // Generate build configs for each entry point
  const configs = entryPoints.map(entryPoint => {
    const filename = path.basename(entryPoint, '.ts')

    const builds = []

    const esmConfig = {
      ...commonSettings,
      outfile: `dist/test/${filename}.esm.js`,
      format: 'esm',
      platform: 'node',
      entryPoints: [entryPoint],
      banner: bannerLog(`
console.log('esm/node build');`, `
import { createRequire } from 'module'; 
const require = createRequire(import.meta.url);
        `)
    }

    builds.push(esmConfig)

    if (/fireproof\./.test(entryPoint)) {
      const esmPublishConfig = {
        ...esmConfig,
        outfile: `dist/node/${filename}.esm.js`,
        entryPoints: [entryPoint]
      }
      builds.push(esmPublishConfig)

      const cjsConfig = {
        ...commonSettings,
        outfile: `dist/node/${filename}.cjs`,
        format: 'cjs',
        platform: 'node',
        entryPoints: [entryPoint],
        banner: bannerLog`
console.log('cjs/node build');
`

      }
      builds.push(cjsConfig)

      // popular builds inherit here
      const browserIIFEConfig = {
        ...commonSettings,
        outfile: `dist/browser/${filename}.iife.js`,
        format: 'iife',
        globalName: 'Fireproof',
        platform: 'browser',
        target: 'es2020',
        entryPoints: [entryPoint],
        banner: bannerLog`
console.log('browser/es2015 build');
`,
        plugins: [
          polyfillNode({
            // todo remove crypto and test
            polyfills: { crypto: true, fs: true, process: 'empty' }
          }),
          // alias({
          //   crypto: 'crypto-browserify'
          // }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ...commonSettings.plugins
        ]
      }

      builds.push(browserIIFEConfig)

      // create react app uses this
      const browserESMConfig = {
        ...browserIIFEConfig,
        outfile: `dist/browser/${filename}.esm.js`,
        format: 'esm',
        banner: bannerLog`
console.log('esm/es2015 build');
`
      }

      builds.push(browserESMConfig)

      // most popular
      const browserCJSConfig = {
        ...browserIIFEConfig,
        outfile: `dist/browser/${filename}.cjs`,
        format: 'cjs',
        banner: bannerLog`
console.log('cjs/es2015 build');
`
      }
      builds.push(browserCJSConfig)
    }

    return builds
  })

  return configs.flat()
}
