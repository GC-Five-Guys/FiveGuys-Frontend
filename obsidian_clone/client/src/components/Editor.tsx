import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import tippy, { Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // Missing CSS
import { TagSuggestionList } from './TagSuggestionList';

interface EditorProps {
  currentPath: string;
  onSave: (content: string) => void;
  setSaveStatus: (status: string) => void;
}

const suggestions = {
  person: ['엄마', '아빠', '동기A', '교수님'],
  topic: ['감정조절', '공부', '회사', '여행'],
  object: ['커피', '독서', '프로젝트', '노트북']
};

const createSuggestionConfig = (type: 'person' | 'topic' | 'object', char: string) => ({
  char,
  items: ({ query }: { query: string }) => {
    const allItems = suggestions[type];
    const filtered = allItems.filter(item => 
      item.toLowerCase().startsWith(query.toLowerCase())
    ).slice(0, 5);
    
    if (query && !filtered.includes(query)) {
      return [...filtered, `+ ${query}`];
    }
    return filtered;
  },
  command: ({ editor, range, props }: any) => {
    const label = props.id.startsWith('+ ') ? props.id.substring(2) : props.id;
    
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: type === 'person' ? 'mention' : type,
          attrs: { ...props, id: label, label },
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run();

    window.getSelection()?.collapseToEnd();
  },
  render: () => {
    let component: ReactRenderer | null = null;
    let popup: Instance[] | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(TagSuggestionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0].hide();
          return true;
        }

        return (component?.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup?.[0].destroy();
        component?.destroy();
      },
    };
  },
});

export const Editor: React.FC<EditorProps> = ({
  currentPath,
  onSave,
  setSaveStatus,
}) => {
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '오늘의 일기를 기록해 보세요...',
      }),
      Mention.extend({ name: 'mention' }).configure({
        HTMLAttributes: { class: 'mention-node person' },
        suggestion: createSuggestionConfig('person', '@'),
      }),
      Mention.extend({ name: 'topic' }).configure({
        HTMLAttributes: { class: 'mention-node topic' },
        suggestion: createSuggestionConfig('topic', '#'),
      }),
      Mention.extend({ name: 'object' }).configure({
        HTMLAttributes: { class: 'mention-node object' },
        suggestion: createSuggestionConfig('object', '&'),
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus("저장 중...");
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        onSave(editor.getHTML());
      }, 1000);
    },
  });

  // Load content when currentPath changes
  useEffect(() => {
    if (editor && currentPath) {
      fetch(`/api/notes/${encodeURIComponent(currentPath)}`)
        .then(res => res.json())
        .then(data => {
          editor.commands.setContent(data.content || '');
          setSaveStatus("저장됨 ✓");
        })
        .catch(console.error);
    }
  }, [currentPath, editor, setSaveStatus]);

  if (!editor) {
    return null;
  }

  return (
    <div id="editor-view" className="view-pane">
      <div className="viewer-header">
        <input
          type="text"
          id="viewer-title"
          placeholder="제목 없는 일기"
          disabled={!currentPath}
          value={currentPath.split('/').pop()?.replace('.md', '') || ""}
          readOnly
        />
      </div>
      <div id="editor-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
