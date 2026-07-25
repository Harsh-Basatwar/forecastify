const archiver = require('archiver');
const fs = require('fs');

const output = fs.createWriteStream('/Users/darshanpatil/Documents/Projects/Forecastify/public/arjuna-sarthi-extension.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);
archive.directory('/Users/darshanpatil/Documents/Projects/Forecastify/extension/dist/', false);
archive.finalize();
