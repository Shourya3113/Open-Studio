import React from 'react';
import { TabBar } from './TabBar';
import { MonacoEditor } from './MonacoEditor';
import { useEditorStore } from '../../stores/editorStore';

export const EditorContainer: React.FC = () => {
  const { activeBufferId, splitActiveBufferId, splitDirection } = useEditorStore();

  if (splitDirection === 'none') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-ide-editor">
        <TabBar />
        <div className="flex-1 relative overflow-hidden">
          <MonacoEditor bufferId={activeBufferId} />
        </div>
      </div>
    );
  }

  const isVertical = splitDirection === 'vertical';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-ide-editor">
      <TabBar />
      <div className={`flex-1 flex overflow-hidden ${isVertical ? 'flex-row' : 'flex-col'}`}>
        {/* Primary Pane */}
        <div className={`flex-1 relative overflow-hidden ${isVertical ? 'border-r border-ide-border' : 'border-b border-ide-border'}`}>
          <MonacoEditor bufferId={activeBufferId} />
        </div>

        {/* Split Secondary Pane */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <TabBar isSplitPane />
          <div className="flex-1 relative overflow-hidden">
            <MonacoEditor bufferId={splitActiveBufferId} />
          </div>
        </div>
      </div>
    </div>
  );
};
