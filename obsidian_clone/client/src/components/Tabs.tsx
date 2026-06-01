import React from 'react';
import { Tab } from '../types';

interface TabsProps {
  openTabs: Tab[];
  currentPath: string;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ openTabs, currentPath, onTabClick, onTabClose }) => {
  return (
    <header id="tab-bar">
      <div className="tabs-container">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            className={`tab ${currentPath === tab.path ? 'active' : ''}`}
            onClick={() => onTabClick(tab.path)}
          >
            📄 {tab.name}
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    </header>
  );
};
