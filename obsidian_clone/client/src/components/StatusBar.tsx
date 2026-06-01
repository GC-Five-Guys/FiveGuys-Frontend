import React from 'react';

interface StatusBarProps {
  saveStatus: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ saveStatus }) => {
  return (
    <footer id="status-bar">
      <div className="status-left"></div>
      <div className="status-right">
        <span id="save-status">{saveStatus}</span>
        <span className="divider">|</span>
        <span className="version">v0.2.0</span>
      </div>
    </footer>
  );
};
