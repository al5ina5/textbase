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
    default:
        lib.dev()
        break
}