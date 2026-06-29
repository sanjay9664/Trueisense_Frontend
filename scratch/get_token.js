import fs from 'fs';
import path from 'path';

function findLevelDbDirs(baseDir, list = []) {
  if (!fs.existsSync(baseDir)) return list;
  try {
    const files = fs.readdirSync(baseDir);
    for (const file of files) {
      const fullPath = path.join(baseDir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file === 'leveldb') {
            list.push(fullPath);
          } else if (file !== 'node_modules' && file !== '.git' && file !== 'Cache') {
            findLevelDbDirs(fullPath, list);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return list;
}

const basePaths = [
  path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data'),
  path.join(process.env.LOCALAPPDATA, 'Microsoft/Edge/User Data')
];

let levelDbDirs = [];
for (const bp of basePaths) {
  findLevelDbDirs(bp, levelDbDirs);
}

console.log("Found LevelDB directories:", levelDbDirs.length);

let found = false;
for (const dbPath of levelDbDirs) {
  try {
    const files = fs.readdirSync(dbPath);
    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.ldb')) {
        try {
          const content = fs.readFileSync(path.join(dbPath, file), 'binary');
          const match = content.match(/sochiot_token[\x00-\x20]*:?[\x00-\x20]*\"?(eyJ[a-zA-Z0-9_\-\.]+)\"?/);
          if (match) {
            console.log("Token found in file:", path.join(dbPath, file));
            console.log("Token:", match[1]);
            found = true;
            break;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  if (found) break;
}

if (!found) {
  console.log("No token found");
}
