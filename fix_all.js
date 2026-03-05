const fs = require('fs');
let f = 'client/src/App.js';
let c = fs.readFileSync(f, 'utf8');

// 1. Remove submitContestAnswer from import (already removed if not present)
c = c.replace(', submitContestAnswer,', ',');
c = c.replace(', submitContestAnswer ', ' ');

// 2. Check for duplicate ContestPage - find all occurrences
const matches = [];
let idx = 0;
while ((idx = c.indexOf('function ContestPage()', idx)) !== -1) {
    matches.push(idx);
    idx += 10;
}
console.log('Found ContestPage at positions:', matches);

// If there are 2, the first one (old) needs to be removed
if (matches.length === 2) {
    // The first one runs from matches[0] to just before the second one
    // Find the start of the section (look for the comment block before it)
    let firstStart = c.lastIndexOf('// -----', matches[0]);
    while (firstStart > 0 && !c.substring(firstStart, firstStart + 300).includes('Contest Page')) {
        firstStart = c.lastIndexOf('// -----', firstStart - 1);
    }

    // Find the end: just before the second ContestPage's comment block
    let secondStart = c.lastIndexOf('// -----', matches[1]);
    while (secondStart > firstStart + 100 && !c.substring(secondStart, secondStart + 300).includes('Contest Page')) {
        secondStart = c.lastIndexOf('// -----', secondStart - 1);
    }

    if (firstStart >= 0 && secondStart > firstStart) {
        c = c.substring(0, firstStart) + c.substring(secondStart);
        console.log('Removed old ContestPage');
    }
}

// 3. Fix line 833-835 issues - the ContestPage should use navigate and user
// Check if the remaining ContestPage uses navigate
if (!c.includes('const navigate = useNavigate();') || c.indexOf('const navigate = useNavigate();', c.indexOf('function ContestPage')) === -1) {
    // Navigate not used in ContestPage - that's fine, we don't need it
}

// 4. Make sure ContestPage uses navigate if needed, or remove unused
// The real ContestPage should have navigate for potential future use
// For now, just make sure there's no unused var

// Re-check
const cpIdx = c.indexOf('function ContestPage()');
if (cpIdx > 0) {
    const cpBlock = c.substring(cpIdx, cpIdx + 500);
    console.log('ContestPage starts with:', cpBlock.substring(0, 200));

    // If navigate is declared but not used, remove it
    if (cpBlock.includes('const navigate = useNavigate()') && !c.substring(cpIdx).includes('navigate(')) {
        // Don't declare navigate
        c = c.replace(
            /function ContestPage\(\) \{\n  const navigate = useNavigate\(\);\n  const \{ isAuthenticated, user \} = useAuth\(\);/,
            'function ContestPage() {\n  const { isAuthenticated } = useAuth();'
        );
        c = c.replace(
            /function ContestPage\(\) \{\r?\n  const navigate = useNavigate\(\);\r?\n  const \{ isAuthenticated, user \} = useAuth\(\);/,
            'function ContestPage() {\n  const { isAuthenticated } = useAuth();'
        );
        console.log('Removed unused navigate from ContestPage');
    }
}

fs.writeFileSync(f, c, 'utf8');
console.log('Fixed App.js');

// BOM check
const data = fs.readFileSync(f);
if (data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
    fs.writeFileSync(f, data.subarray(3));
    console.log('BOM removed');
}
