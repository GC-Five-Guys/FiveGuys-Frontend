let currentFileName = "";
let autoSaveTimeout = null;
let vditor;

document.addEventListener('DOMContentLoaded', async () => {
    // Vditor 생성 (Instant Rendering 모드)
    vditor = new Vditor('vditor', {
        height: '100%',
        mode: 'ir', // 실시간 마크다운 적용
        theme: 'dark',
        placeholder: '내용을 입력해 보세요...',
        outline: {
            enable: false, // 네비게이션 기능 비활성화
        },
        cache: {
            enable: false,
        },
        input(value) {
            if(!currentFileName) return;
            if(autoSaveTimeout) clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveNote();
            }, 1000)
        }
    });

    const newNoteBtn = document.getElementById('new-note-btn');
    const newFolderBtn = document.getElementById('new-folder-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorPicker = document.getElementById('text-color-picker');
    const resetBtn = document.getElementById('reset-theme');
    const titleInput = document.getElementById('viewer-title');

    refreshNoteList();

    // [새 노트 생성]
    newNoteBtn.addEventListener('click', async () => {
        const fileName = prompt('생성할 파일 이름을 입력하세요:');
        if (!fileName) return;
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fileName }),
            });
            if(response.ok) {
                const data = await response.json();
                await refreshNoteList();
                loadNoteContent(data.fileName);
            }
        } catch (error) { console.error(error); }
    });

    // [새 폴더 생성]
    newFolderBtn.addEventListener('click', async () => {
        const folderName = prompt('생성할 폴더 이름을 입력하세요:');
        if (!folderName) return;
        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderName })
            });
            if (response.ok) await refreshNoteList();
        } catch (error) { console.error(error); }
    });

    settingsBtn.addEventListener('click', () => {
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
    });

    function updateTheme(bg, text) {
        document.documentElement.style.setProperty('--bg-app', bg);
        document.documentElement.style.setProperty('--text-primary', text);
        bgColorPicker.value = bg;
        textColorPicker.value = text;
        localStorage.setItem('os-bg-color', bg);
        localStorage.setItem('os-text-color', text);
    }

    bgColorPicker.addEventListener('input', (e) => updateTheme(e.target.value, textColorPicker.value));
    textColorPicker.addEventListener('input', (e) => updateTheme(bgColorPicker.value, e.target.value));
    resetBtn.addEventListener('click', () => updateTheme('#0f0f0f', '#dcddde'));

    const savedBg = localStorage.getItem('os-bg-color');
    const savedText = localStorage.getItem('os-text-color');
    if(savedBg && savedText) updateTheme(savedBg, savedText);

    titleInput.addEventListener('blur', () => saveNote());
});

// [목록 갱신] 트리를 재귀적으로 렌더링
async function refreshNoteList() {
    const listElement = document.getElementById('note-list');
    if(!listElement) return;

    try {
        listElement.innerHTML = '';
        const response = await fetch('/api/notes');
        const treeData = await response.json();

        function renderTree(nodes, container){
            nodes.forEach(node => {
                const li = document.createElement('li');
                
                // 한 줄을 담당할 컨테이너 (이름 + 버튼)
                const row = document.createElement('div');
                row.className = 'tree-row';
                
                if (node.type === 'folder') {
                    row.innerHTML = `<span class="folder-name">📁 ${node.name}</span>`;
                    
                    const delBtn = document.createElement('span');
                    delBtn.textContent = '✕';
                    delBtn.className = 'list-delete-btn';
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`폴더 '${node.name}'과 내부 파일을 모두 삭제하시겠습니까?`)) return;
                        const delRes = await fetch(`/api/notes/${encodeURIComponent(node.path)}`, { method: 'DELETE' });
                        if (delRes.ok) await refreshNoteList();
                    });
                    row.appendChild(delBtn);
                    li.appendChild(row);

                    const subUl = document.createElement('ul');
                    subUl.className = 'sub-folder';
                    subUl.style.display = 'none';

                    row.addEventListener('click', (e) => {
                        e.stopPropagation();
                        subUl.style.display = subUl.style.display === 'none' ? 'block' : 'none';
                    });
                    
                    li.appendChild(subUl);
                    renderTree(node.children, subUl);

                } else {
                    row.innerHTML = `<span>📄 ${node.name.replace('.md', '')}</span>`;
                    row.setAttribute('data-path', node.path);
                    
                    const delBtn = document.createElement('span');
                    delBtn.textContent = '✕';
                    delBtn.className = 'list-delete-btn';
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if(!confirm(`'${node.name}' 파일을 삭제하시겠습니까?`)) return;
                        const delRes = await fetch(`/api/notes/${encodeURIComponent(node.path)}`, { method: 'DELETE' });
                        if(delRes.ok) await refreshNoteList();
                    });
                    row.appendChild(delBtn);

                    row.addEventListener('click', (e) => {
                       e.stopPropagation();
                       loadNoteContent(node.path);
                    });
                    li.appendChild(row);
                }
                container.appendChild(li);
            });
        }
        renderTree(treeData, listElement);
    } catch (error) { console.error(error); }
}

// [내용 로드]
async function loadNoteContent(path) {
    currentFileName = path;
    const titleElement = document.getElementById('viewer-title');
    titleElement.disabled = false;
    document.body.classList.add('show-editor');

    // 강조 처리
    document.querySelectorAll('.tree-row').forEach(row => {
        row.classList.remove('active');
        if(row.getAttribute('data-path') === path) row.classList.add('active');
    });

    try {
        const response = await fetch(`/api/notes/${encodeURIComponent(path)}`);
        const data = await response.json();
        titleElement.value = path.split('/').pop().replace('.md', '');
        vditor.setValue(data.content);
    } catch (error) { console.error(error); }
}

// [자동 저장]
async function saveNote(){
    if(!currentFileName) return;
    const title = document.getElementById('viewer-title').value;
    const content = vditor.getValue();
    try {
        const response = await fetch(`/api/notes/${encodeURIComponent(currentFileName)}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ newFileName: title, content: content })
        });
        if(response.ok){
            const data = await response.json();
            if(currentFileName !== data.fileName){
                currentFileName = data.fileName;
                await refreshNoteList();
            }
        }
    } catch (error) { console.error(error); }
}
