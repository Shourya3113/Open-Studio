import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronDown, 
  FilePlus, 
  FolderPlus, 
  RefreshCw,
  File
} from 'lucide-react';
import { FileNode } from '../../types/fs';
import { useEditorStore } from '../../stores/editorStore';

const MOCK_WORKSPACE_TREE: FileNode = {
  path: 'D:/projects/Open Studio',
  name: 'Open Studio',
  is_dir: true,
  children: [
    {
      path: 'D:/projects/Open Studio/src',
      name: 'src',
      is_dir: true,
      children: [
        {
          path: 'D:/projects/Open Studio/src/components',
          name: 'components',
          is_dir: true,
          children: [
            { path: 'D:/projects/Open Studio/src/components/editor/MonacoEditor.tsx', name: 'MonacoEditor.tsx', is_dir: false },
            { path: 'D:/projects/Open Studio/src/components/editor/TabBar.tsx', name: 'TabBar.tsx', is_dir: false },
            { path: 'D:/projects/Open Studio/src/components/editor/EditorContainer.tsx', name: 'EditorContainer.tsx', is_dir: false },
            { path: 'D:/projects/Open Studio/src/components/sidebar/FileTree.tsx', name: 'FileTree.tsx', is_dir: false },
          ]
        },
        {
          path: 'D:/projects/Open Studio/src/stores',
          name: 'stores',
          is_dir: true,
          children: [
            { path: 'D:/projects/Open Studio/src/stores/editorStore.ts', name: 'editorStore.ts', is_dir: false },
          ]
        },
        { path: 'D:/projects/Open Studio/src/App.tsx', name: 'App.tsx', is_dir: false },
        { path: 'D:/projects/Open Studio/src/main.tsx', name: 'main.tsx', is_dir: false },
        { path: 'D:/projects/Open Studio/src/index.css', name: 'index.css', is_dir: false },
      ]
    },
    {
      path: 'D:/projects/Open Studio/src-tauri',
      name: 'src-tauri',
      is_dir: true,
      children: [
        {
          path: 'D:/projects/Open Studio/src-tauri/src',
          name: 'src',
          is_dir: true,
          children: [
            { path: 'D:/projects/Open Studio/src-tauri/src/main.rs', name: 'main.rs', is_dir: false },
            { path: 'D:/projects/Open Studio/src-tauri/src/lib.rs', name: 'lib.rs', is_dir: false },
          ]
        },
        { path: 'D:/projects/Open Studio/src-tauri/Cargo.toml', name: 'Cargo.toml', is_dir: false },
        { path: 'D:/projects/Open Studio/src-tauri/tauri.conf.json', name: 'tauri.conf.json', is_dir: false },
      ]
    },
    { path: 'D:/projects/Open Studio/README.md', name: 'README.md', is_dir: false },
    { path: 'D:/projects/Open Studio/OPEN_STUDIO_EXECUTION_MASTERPLAN.md', name: 'OPEN_STUDIO_EXECUTION_MASTERPLAN.md', is_dir: false },
    { path: 'D:/projects/Open Studio/package.json', name: 'package.json', is_dir: false },
    { path: 'D:/projects/Open Studio/tsconfig.json', name: 'tsconfig.json', is_dir: false },
  ]
};

export const FileTree: React.FC = () => {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['D:/projects/Open Studio', 'D:/projects/Open Studio/src']));
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const { openFile, activeBufferId, buffers } = useEditorStore();
  const activePath = activeBufferId ? buffers[activeBufferId]?.filePath : null;

  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const tree = await invoke<FileNode>('read_workspace_tree');
      setRootNode(tree);
      setExpandedPaths(prev => new Set([...prev, tree.path]));

      // Start fs watcher
      try {
        await invoke('start_fs_watcher', { rootPath: tree.path });
        const { listen } = await import('@tauri-apps/api/event');
        listen('workspace-fs-change', () => {
          loadWorkspace();
        });
      } catch {
        // Watcher already running or non-desktop
      }
    } catch {
      // Browser preview fallback
      setRootNode(MOCK_WORKSPACE_TREE);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const toggleFolder = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = async (node: FileNode) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file_content', { path: node.path });
      openFile(node.path, content);
    } catch {
      // Browser fallback content
      openFile(node.path, `// ${node.name}\n// Loaded via Open Studio File Explorer\n\nexport const file = '${node.name}';\n`);
    }
  };

  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }

    const targetPath = `${rootNode?.path || '.'}/${newFileName.trim()}`;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('create_file', { path: targetPath });
      await loadWorkspace();
    } catch {
      // Mock creation in browser
      if (rootNode && rootNode.children) {
        rootNode.children.push({
          path: targetPath,
          name: newFileName.trim(),
          is_dir: false,
        });
        setRootNode({ ...rootNode });
      }
    }

    openFile(targetPath, '');
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode size={14} className="text-blue-400 shrink-0" />;
      case 'rs':
        return <FileCode size={14} className="text-orange-400 shrink-0" />;
      case 'py':
        return <FileCode size={14} className="text-yellow-400 shrink-0" />;
      case 'json':
        return <FileJson size={14} className="text-amber-400 shrink-0" />;
      case 'md':
        return <FileText size={14} className="text-teal-400 shrink-0" />;
      case 'css':
      case 'html':
        return <FileSpreadsheet size={14} className="text-cyan-400 shrink-0" />;
      default:
        return <File size={14} className="text-ide-textMuted shrink-0" />;
    }
  };

  const renderNode = (node: FileNode, level = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = activePath === node.path;
    const paddingLeft = `${level * 14 + 6}px`;

    if (node.is_dir) {
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft }}
            className="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-ide-hover cursor-pointer text-ide-textNormal hover:text-ide-textBright transition-colors text-xs"
          >
            <span className="text-ide-textMuted">
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            <span className="text-amber-300">
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
            <span className="truncate font-medium">{node.name}</span>
          </div>

          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={() => handleFileClick(node)}
        style={{ paddingLeft }}
        className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer transition-colors text-xs select-none ${
          isSelected
            ? 'bg-ide-selected text-ide-textBright font-semibold'
            : 'hover:bg-ide-hover text-ide-textNormal hover:text-ide-textBright'
        }`}
      >
        <span className="w-3"></span>
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs select-none">
      {/* Explorer Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-ide-border/60 text-ide-textMuted bg-ide-sidebar">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-ide-textBright">
          {rootNode?.name || 'Workspace'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreatingFile(true)}
            title="New File"
            className="p-1 rounded hover:bg-ide-hover hover:text-ide-textBright transition"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => toggleFolder(rootNode?.path || '')}
            title="Collapse / Expand All"
            className="p-1 rounded hover:bg-ide-hover hover:text-ide-textBright transition"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={loadWorkspace}
            title="Refresh Explorer"
            className={`p-1 rounded hover:bg-ide-hover hover:text-ide-textBright transition ${isLoading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* New File Inline Prompt */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-ide-border bg-ide-bg flex items-center gap-1">
          <File size={13} className="text-ide-accent" />
          <input
            type="text"
            autoFocus
            placeholder="filename.ts"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => setIsCreatingFile(false)}
            className="w-full bg-transparent border-none text-xs text-ide-textBright focus:outline-none"
          />
        </form>
      )}

      {/* Recursive Tree Container */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {rootNode && rootNode.children ? (
          rootNode.children.map(child => renderNode(child, 0))
        ) : (
          <div className="p-4 text-center text-ide-textMuted">Loading workspace...</div>
        )}
      </div>
    </div>
  );
};
