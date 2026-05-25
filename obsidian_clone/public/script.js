let currentFileName = "";
let selectedFolderPath = ""; // 현재 선택된 폴더 경로 추적
let autoSaveTimeout = null;
let vditor;
let openTabs = []; // {path, name}

document.addEventListener('DOMContentLoaded', async () => {
    // Vditor 생성 (Instant Rendering 모드)
    vditor = new Vditor('vditor', {
        height: '100%',
        mode: 'ir',
        theme: 'dark',
        placeholder: '오늘의 일기를 기록해 보세요...',
        outline: { enable: false },
        cache: { enable: false },
        input(value) {
            if(!currentFileName) return;
            showSaveStatus("저장 중...");
            if(autoSaveTimeout) clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveNote();
            }, 1000)
        }
    });

    // UI 요소들
    const newNoteBtn = document.getElementById('new-note-btn');
    const newFolderBtn = document.getElementById('new-folder-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const titleInput = document.getElementById('viewer-title');
    const menuItems = document.querySelectorAll('.menu-item');
    const tabsContainer = document.getElementById('tabs-container');

    refreshNoteList();

    // [Pane 1] 메뉴 전환
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.id === 'settings-btn') return;
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (item.title === '파일 모드') {
                document.getElementById('editor-view').style.display = 'flex';
                document.getElementById('graph-view').style.display = 'none';
            } else if (item.title === '그래프 모드') {
                document.getElementById('editor-view').style.display = 'none';
                document.getElementById('graph-view').style.display = 'flex';
            }
        });
    });

    // [새 노트 생성]
    newNoteBtn.addEventListener('click', async () => {
        const fileName = prompt(selectedFolderPath ? `'${selectedFolderPath}' 폴더에 생성할 일기 제목을 입력하세요:` : '생성할 일기 제목을 입력하세요:');
        if (!fileName) return;
        
        // 폴더가 선택되어 있으면 경로 조합
        const fullFileName = selectedFolderPath ? `${selectedFolderPath}/${fileName}` : fileName;
        
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fileName: fullFileName }),
            });
            if(response.ok) {
                const data = await response.json();
                await refreshNoteList();
                openNote(data.fileName);
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

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        settingsMenu.style.display = 'none';
    });

    settingsMenu.addEventListener('click', (e) => e.stopPropagation());

    titleInput.addEventListener('blur', () => saveNote());
});

// [목록 갱신]
async function refreshNoteList() {
    const listElement = document.getElementById('note-list');
    const recentListElement = document.getElementById('recent-notes-list');
    if(!listElement) return;

    try {
        listElement.innerHTML = '';
        const response = await fetch('/api/notes');
        const treeData = await response.json();

        const allFiles = [];

        function renderTree(nodes, container){
            nodes.forEach(node => {
                const li = document.createElement('li');
                const row = document.createElement('div');
                row.className = 'tree-row';
                
                if (node.type === 'folder') {
                    row.innerHTML = `<span class="folder-name">📁 ${node.name}</span>`;
                    row.setAttribute('data-path', node.path);
                    
                    if (selectedFolderPath === node.path) row.classList.add('selected-folder');

                    const delBtn = document.createElement('span');
                    delBtn.textContent = '✕';
                    delBtn.className = 'list-delete-btn';
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`폴더 '${node.name}'과 내부 파일을 모두 삭제하시겠습니까?`)) return;
                        const delRes = await fetch(`/api/notes/${encodeURIComponent(node.path)}`, { method: 'DELETE' });
                        if (delRes.ok) {
                            if (selectedFolderPath === node.path) selectedFolderPath = "";
                            await refreshNoteList();
                        }
                    });
                    row.appendChild(delBtn);
                    
                    li.appendChild(row);

                    const subUl = document.createElement('ul');
                    subUl.className = 'sub-folder';
                    subUl.style.display = 'none';
                    subUl.style.paddingLeft = '12px';

                    row.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // 폴더 선택 로직
                        document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('selected-folder'));
                        if (selectedFolderPath === node.path) {
                            selectedFolderPath = ""; // 이미 선택된 폴더면 해제
                        } else {
                            selectedFolderPath = node.path;
                            row.classList.add('selected-folder');
                        }

                        // 폴더 열고 닫기 로직
                        subUl.style.display = subUl.style.display === 'none' ? 'block' : 'none';
                    });
                    
                    li.appendChild(subUl);
                    renderTree(node.children, subUl);

                } else {
                    const displayName = node.name.replace('.md', '');
                    allFiles.push({name: displayName, path: node.path});
                    row.innerHTML = `<span>📄 ${displayName}</span>`;
                    row.setAttribute('data-path', node.path);
                    
                    const delBtn = document.createElement('span');
                    delBtn.textContent = '✕';
                    delBtn.className = 'list-delete-btn';
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if(!confirm(`'${displayName}' 일기를 삭제하시겠습니까?`)) return;
                        const delRes = await fetch(`/api/notes/${encodeURIComponent(node.path)}`, { method: 'DELETE' });
                        if(delRes.ok) {
                            closeTab(node.path);
                            await refreshNoteList();
                        }
                    });
                    row.appendChild(delBtn);

                    row.addEventListener('click', (e) => {
                       e.stopPropagation();
                       openNote(node.path);
                    });
                    li.appendChild(row);
                }
                container.appendChild(li);
            });
        }
        renderTree(treeData, listElement);

        // 최근 노트 업데이트 (단순히 마지막 5개)
        if(recentListElement) {
            recentListElement.innerHTML = '';
            allFiles.slice(-5).reverse().forEach(file => {
                const li = document.createElement('li');
                li.className = 'tree-row';
                li.innerHTML = `<span>📄 ${file.name}</span>`;
                li.addEventListener('click', () => openNote(file.path));
                recentListElement.appendChild(li);
            });
        }
    } catch (error) { console.error(error); }
}

// [노트 열기 (탭 추가 포함)]
function openNote(path) {
    const name = path.split('/').pop().replace('.md', '');
    
    // 탭이 이미 열려있는지 확인
    if (!openTabs.find(t => t.path === path)) {
        openTabs.push({path, name});
    }
    
    updateTabsUI(path);
    loadNoteContent(path);
}

function updateTabsUI(activePath) {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    openTabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.path === activePath ? 'active' : ''}`;
        tabEl.innerHTML = `📄 ${tab.name} <span class="tab-close">×</span>`;
        
        tabEl.addEventListener('click', () => openNote(tab.path));
        
        tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.path);
        });
        
        container.appendChild(tabEl);
    });
}

function closeTab(path) {
    openTabs = openTabs.filter(t => t.path !== path);
    if (currentFileName === path) {
        if (openTabs.length > 0) {
            openNote(openTabs[openTabs.length - 1].path);
        } else {
            currentFileName = "";
            document.getElementById('viewer-title').value = "";
            document.getElementById('viewer-title').disabled = true;
            vditor.setValue("");
            updateTabsUI("");
        }
    } else {
        updateTabsUI(currentFileName);
    }
}

// [내용 로드]
async function loadNoteContent(path) {
    currentFileName = path;
    const titleElement = document.getElementById('viewer-title');
    titleElement.disabled = false;

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
        showSaveStatus("저장됨 ✓");
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
            showSaveStatus("저장됨 ✓");
            if(currentFileName !== data.fileName){
                // 제목이 변경된 경우 탭 정보 업데이트
                const tab = openTabs.find(t => t.path === currentFileName);
                if(tab) {
                    tab.path = data.fileName;
                    tab.name = title;
                }
                currentFileName = data.fileName;
                await refreshNoteList();
                updateTabsUI(currentFileName);
            }
        }
    } catch (error) { console.error(error); }
}

function showSaveStatus(text) {
    const el = document.getElementById('save-status');
    if(el) el.textContent = text;
}
