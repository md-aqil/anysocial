const fs = require('fs');
const path = '/Users/mdaqil/Documents/anysocial/src/services/ai-orchestrator.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix audioContent type
code = code.replace(
  /fs\.writeFileSync\(tempPath, response\.audioContent, 'binary'\);/,
  "fs.writeFileSync(tempPath, response.audioContent as Uint8Array, 'binary');"
);

fs.writeFileSync(path, code);
console.log('Fixed typescript errors');
