const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

// Path to the source PNG file
const pngPath = path.join(__dirname, 'src/assets/logo.png');
// Path where the ICO file will be saved
const icoPath = path.join(__dirname, 'src/assets/logo.ico');

console.log('Converting PNG to ICO...');
console.log('Source:', pngPath);
console.log('Destination:', icoPath);

// Check if the source file exists
if (!fs.existsSync(pngPath)) {
  console.error('Source PNG file does not exist:', pngPath);
  process.exit(1);
}

// Convert PNG to ICO
pngToIco([pngPath])
  .then(buf => {
    // Write the ICO file
    fs.writeFileSync(icoPath, buf);
    console.log('Conversion successful. ICO file saved to:', icoPath);
  })
  .catch(err => {
    console.error('Error converting PNG to ICO:', err);
    process.exit(1);
  }); 