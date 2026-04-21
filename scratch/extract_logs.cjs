const fs = require('fs');
const logPath = 'C:\\Users\\igorp\\.gemini\\antigravity\\brain\\2c0d6a57-df56-41b9-b2bf-41f396d0f734\\.system_generated\\logs\\overview.txt';

if (fs.existsSync(logPath)) {
    const logData = fs.readFileSync(logPath, 'utf8');
    const lines = logData.split('\n');
    const recoveredLines = new Map();

    let capturing = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // This is where view_file prints output
        if (line.includes('The following code has been modified to include a line number before every line')) {
            capturing = true;
            continue;
        }
        
        if (capturing) {
            // Check if it's the end of a view_file block
            if (line.includes('The above content does NOT show the entire file contents') || line.includes('File Path: `file://')) {
                capturing = false;
                continue;
            }
            if (line.trim() === '```') {
                capturing = false;
                continue;
            }

            // Match format: 123: content
            const match = line.match(/^(\d+): (.*)$/);
            if (match) {
                const lineNum = parseInt(match[1], 10);
                // The match[2] is the actual line content. Note: sometimes it might be just \r or empty
                recoveredLines.set(lineNum, match[2]);
            } else if (line.match(/^(\d+):$/)) {
                // Empty line match like "123:"
                const matchEmpty = line.match(/^(\d+):$/);
                const lineNum = parseInt(matchEmpty[1], 10);
                recoveredLines.set(lineNum, '');
            } else {
                // If it doesn't match the line number format, we probably hit the end
                // or some other artifact. But let's check carefully.
                if (!line.includes('[diff_block')) {
                    // console.log("Stopped at:", line);
                }
                capturing = false;
            }
        }
    }

    console.log('Recovered line numbers count:', recoveredLines.size);
    const maxLine = Math.max(...Array.from(recoveredLines.keys()));
    console.log('Max line:', maxLine);

    // Save recovered map to disk just in case
    fs.writeFileSync('scratch/recovered_lines.json', JSON.stringify(Array.from(recoveredLines.entries())));

} else {
    console.log('Log file not found:', logPath);
}
