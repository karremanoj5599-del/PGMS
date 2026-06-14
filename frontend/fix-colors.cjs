const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\baind\\OneDrive\\Desktop\\PGMS\\frontend\\src';

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      replaceInFiles(filePath);
    } else if (filePath.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      content = content.replace(/#1e293b/g, 'var(--card-bg)');
      content = content.replace(/#0f172a/g, 'var(--bg-dark)');
      content = content.replace(/#2d3748/g, 'var(--bg-dark)');
      content = content.replace(/#1a2233/g, 'var(--bg-dark)');
      
      // Update text colors
      content = content.replace(/color:\s*'white'/g, "color: 'var(--text-main)'");
      content = content.replace(/color:\s*"white"/g, "color: 'var(--text-main)'");
      content = content.replace(/color:\s*'#fff'/gi, "color: 'var(--text-main)'");
      content = content.replace(/color:\s*"#fff"/gi, "color: 'var(--text-main)'");
      content = content.replace(/color:\s*'#ffffff'/gi, "color: 'var(--text-main)'");
      content = content.replace(/color:\s*"#ffffff"/gi, "color: 'var(--text-main)'");
      
      // Replace white transparencies (often borders or backgrounds on dark mode)
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.0[235]\)/g, 'rgba(128,128,128,0.1)'); 
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'var(--border)');
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.2\)/g, 'var(--border)');
      
      // Special replacements for things like background: 'rgba(255,255,255,0.05)' to just a fallback
      // since it's hard to make a single regex. We replace commonly seen backgrounds
      content = content.replace(/background:\s*'rgba\(255,255,255,0\.05\)'/g, "background: 'var(--bg-dark)'");
      content = content.replace(/background:\s*'rgba\(255,255,255,0\.1\)'/g, "background: 'var(--bg-dark)'");
      
      // And in string literals
      content = content.replace(/rgba\(255,255,255,0\.05\)/g, 'var(--border)');
      content = content.replace(/rgba\(255,255,255,0\.1\)/g, 'var(--border)');
      content = content.replace(/rgba\(255,255,255,0\.2\)/g, 'var(--border)');
      content = content.replace(/rgba\(255,255,255,0\.03\)/g, 'var(--border)');
      content = content.replace(/rgba\(255,255,255,0\.02\)/g, 'var(--border)');

      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

replaceInFiles(dir);
console.log('Replaced hardcoded colors!');
