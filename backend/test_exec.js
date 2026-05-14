const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const fileId = 'testc123';
const filePath = path.join(TEMP_DIR, `${fileId}.c`);
const outPath = path.join(TEMP_DIR, `${fileId}.exe`);

fs.writeFileSync(filePath, '#include <stdio.h>\nint main() { printf("Hello C\\n"); return 0; }');

const command = `gcc "${filePath}" -o "${outPath}" && "${outPath}"`;
console.log('Running:', command);

exec(command, (error, stdout, stderr) => {
    console.log('Error:', error);
    console.log('Stdout:', stdout);
    console.log('Stderr:', stderr);
});
