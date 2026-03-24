const fs = require('fs');
const content = fs.readFileSync('c:/Users/basdu/Downloads/NCKHTA/frontend/app/dashboard/teacher/page.tsx', 'utf8');
const lines = content.split('\n');

const stack = [];
const startLine = 1071;
const endLine = 2082;

for (let i = startLine - 1; i < endLine; i++) {
    const line = lines[i];
    const tags = line.match(/<div|<\/div|<section|<\/section/g);
    if (tags) {
        for (const tag of tags) {
            if (tag.startsWith('</')) {
                if (stack.length === 0) {
                    console.log(`Error: Extra closing tag ${tag} at line ${i + 1}`);
                } else {
                    const top = stack.pop();
                    if (top.tag !== tag.slice(2)) {
                        console.log(`Error: Tag mismatch at line ${i + 1}. Expected </${top.tag}> but got ${tag}`);
                    }
                }
            } else {
                stack.push({ tag: tag.slice(1), line: i + 1 });
            }
        }
    }
}

if (stack.length > 0) {
    console.log('Unclosed tags:');
    stack.forEach(s => console.log(`${s.tag} at line ${s.line}`));
} else {
    console.log('All tags balanced in range!');
}
