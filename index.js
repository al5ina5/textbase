#!/usr/bin/env node

const { program } = require('commander')
const lib = require('./lib')

program.parse(process.argv)

console.log('')
switch (program.args[0]) {
    case 'eject':
        lib.eject()
        break
    case 'build':
        lib.generate()
        break
    case 'help':
        lib.help()
        break
    case 'deploy':
        console.log(`${`Run`.yellow} ${`vercel`.blue} ${`or`.yellow} ${`netlify`.blue} ${`to deploy.`.yellow}`)
        break
    default:
        lib.dev()
        break
}