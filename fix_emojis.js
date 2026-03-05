// Fix encoding issues and remove emojis (keep only 🔥 fire emoji)
const fs = require('fs');

const files = [
    'client/src/components/AssignmentAttempt.js',
    'client/src/components/Profile.js',
    'client/src/App.js',
];

// Map of mojibake sequences to their replacements  
const replacements = [
    // Remove emojis (replace with text or nothing)
    [/â±/g, ''],           // ⏱ timer emoji
    [/â"˜/g, 'i'],          // ⓘ info
    [/âœ¨/g, ''],           // ✨ sparkles
    [/ðŸ'¾/g, ''],          // 💾 floppy
    [/ðŸ"¥/g, ''],          // 🔥 fire - remove from submission (keep in streak via App.js)
    [/ðŸ"Œ/g, ''],          // 📌 pin
    [/ðŸ'¡/g, ''],          // 💡 bulb
    [/âš¡/g, ''],           // ⚡ lightning
    [/ðŸ"/g, ''],          // 📝 memo
    [/ðŸ'¬/g, ''],          // 💬 chat
];

files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf8');
        let changed = false;
        replacements.forEach(([pattern, replacement]) => {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(f, content, 'utf8');
            console.log(`Fixed: ${f}`);
        } else {
            console.log(`No changes: ${f}`);
        }
    } catch (e) {
        console.log(`Error ${f}: ${e.message}`);
    }
});
