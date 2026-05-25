import React, { useEffect, useRef } from 'react';
import Vditor from 'vditor';

interface EditorProps {
  currentPath: string;
  onSave: (vInstance?: Vditor) => void;
  setSaveStatus: (status: string) => void;
  vditor: Vditor | null;
  setVditor: (v: Vditor) => void;
}

export const Editor: React.FC<EditorProps> = ({
  currentPath,
  onSave,
  setSaveStatus,
  vditor,
  setVditor,
}) => {
  const vditorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (vditorRef.current && !vditor) {
      const v = new Vditor('vditor', {
        height: '100%',
        mode: 'ir',
        theme: 'dark',
        placeholder: '오늘의 일기를 기록해 보세요...',
        outline: { enable: false },
        cache: { enable: false },
        input() {
          if (!currentPath) return;
          setSaveStatus("저장 중...");
          if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
          autoSaveTimeout.current = setTimeout(() => {
            onSave(v);
          }, 1000);
        },
      });
      setVditor(v);
    }
  }, [vditor, currentPath, onSave, setSaveStatus, setVditor]);

  // Load content when currentPath changes
  useEffect(() => {
    if (vditor && currentPath) {
      fetch(`/api/notes/${encodeURIComponent(currentPath)}`)
        .then(res => res.json())
        .then(data => {
          vditor.setValue(data.content);
          setSaveStatus("저장됨 ✓");
        })
        .catch(console.error);
    }
  }, [currentPath, vditor, setSaveStatus]);

  return (
    <div id="editor-view" className="view-pane" style={{ display: 'flex' }}>
      <div className="viewer-header">
        <input
          type="text"
          id="viewer-title"
          placeholder="제목 없는 일기"
          disabled={!currentPath}
          value={currentPath.split('/').pop()?.replace('.md', '') || ""}
          readOnly // Title editing logic could be added here
          onBlur={() => onSave()}
        />
      </div>
      <div id="editor-container">
        <div id="vditor" ref={vditorRef}></div>
      </div>
    </div>
  );
};
