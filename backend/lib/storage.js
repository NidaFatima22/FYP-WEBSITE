const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

module.exports = { readJSON, writeJSON };
