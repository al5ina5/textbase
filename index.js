#!/usr/bin/env node

const { program } = require('commander')
const lib = require('./lib/lib')

program.parse(process.argv)

console.log('')
switch (program.args[0]) {
    case 'eject':
        lib.eject()
        break
    case 'build':
        lib.build()
        break
    case 'start':
        lib.start()
        break
    default:
        lib.dev()
        break
}