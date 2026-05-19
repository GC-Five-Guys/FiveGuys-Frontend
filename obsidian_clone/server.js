const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const VAULT_PATH = path.join(__dirname, 'my-vault');

// 폴더 트리 생성 함수
async function getFileTree(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const tree = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(VAULT_PATH, fullPath);

        if (entry.isDirectory()) {
            return {
                name: entry.name,
                type: 'folder',
                path: relativePath,
                children: await getFileTree(fullPath)
            };
        } else if (entry.name.endsWith('.md')) {
            return {
                name: entry.name,
                type: 'file',
                path: relativePath,
            };
        }
    }));
    return tree.filter(Boolean).sort((a, b) => (a.type === 'folder' ? -1 : 1));
}

// API: 폴더 트리 가져오기
app.get('/api/notes', async (req, res) => {
    try {
        const tree = await getFileTree(VAULT_PATH);
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: "Failed to read vault" });
    }
});

// [수정] 정규표현식 객체를 직접 사용하여 경로 문제를 해결
// API: 특정 파일 내용 읽기
app.get(/\/api\/notes\/(.+)/, async (req, res) => {
    try {
        const relativePath = req.params[0]; // 정규표현식의 첫 번째 캡처 그룹
        const filePath = path.join(VAULT_PATH, relativePath);
        const content = await fs.readFile(filePath, 'utf8');
        res.json({ content });
    } catch (err) {
        console.error("Failed to read file", err);
        res.status(404).json({ error: "File not found" });
    }
});

// API: 파일 내용 수정 및 이름 변경
app.put(/\/api\/notes\/(.+)/, async (req, res) => {
    try {
        const oldRelativePath = req.params[0];
        const { newFileName, content } = req.body;
        const oldFullPath = path.join(VAULT_PATH, oldRelativePath);
        
        let currentPath = oldFullPath;
        let finalRelativePath = oldRelativePath;

        if (newFileName) {
            const dirName = path.dirname(oldFullPath);
            const safeNewName = newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`;
            const newFullPath = path.join(dirName, safeNewName);

            if (newFullPath !== oldFullPath) {
                try {
                    await fs.access(newFullPath);
                    return res.status(400).json({ error: "A file with that name already exists." });
                } catch { /* 정상 */ }

                await fs.rename(oldFullPath, newFullPath);
                currentPath = newFullPath;
                finalRelativePath = path.relative(VAULT_PATH, newFullPath);
            }
        }

        await fs.writeFile(currentPath, content || '', 'utf-8');
        res.json({ message: 'Saved successfully.', fileName: finalRelativePath });
    } catch (err) {
        console.error("Failed to update file", err);
        res.status(500).json({ error: "Failed to update file" });
    }
});

// API: 새로운 파일 생성
app.post('/api/notes', async (req, res) => {
    try {
        const { fileName, parentPath = '' } = req.body;
        if (!fileName) return res.status(400).json({ error: "Invalid file name" });

        const safeFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
        const filePath = path.join(VAULT_PATH, parentPath, safeFileName);

        try {
            await fs.access(filePath);
            return res.status(400).json({ error: "File already exists." });
        } catch { /* 정상 */ }

        await fs.writeFile(filePath, '', 'utf-8');
        res.status(201).json({ fileName: path.relative(VAULT_PATH, filePath) });
    } catch (err) {
        console.error("Failed to create file", err);
        res.status(500).json({ error: "Failed to create file" });
    }
});

// API: 새로운 폴더 생성
app.post('/api/folders', async (req, res) => {
    try {
        const { folderName, parentPath = '' } = req.body;
        if (!folderName) return res.status(400).json({ error: "Invalid folder name" });

        const folderPath = path.join(VAULT_PATH, parentPath, folderName);
        await fs.mkdir(folderPath, { recursive: true });
        res.status(201).json({ message: "Folder created" });
    } catch (err) {
        console.error("Failed to create folder", err);
        res.status(500).json({ error: "Failed to create folder" });
    }
});

// API: 파일/폴더 삭제
app.delete(/\/api\/notes\/(.+)/, async (req, res) => {
    try {
        const relativePath = req.params[0];
        const fullPath = path.join(VAULT_PATH, relativePath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            await fs.unlink(fullPath);
        }
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error("Failed to delete", err);
        res.status(500).json({ error: "Failed to delete" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Operating the Obsidian Server: http://localhost:${PORT}`);
});
