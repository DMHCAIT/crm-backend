const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const directory = path.join(__dirname, '..', 'api');
for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.js'))) {
  test(`${file} is valid deployable JavaScript`, () => {
    new vm.Script(fs.readFileSync(path.join(directory, file), 'utf8'), { filename: file });
  });
}
