// configure.tsx

import React from 'react';
import { Header } from './header.tsx';

export const Configure: React.FC = () => {
  
  const electron = (window as any).electron;

  return (
    <div className="App">
      <header className="App-header">
        <Header />
      </header>
      <div>
        Configure<br/>
        The home directory is @ {electron.homeDir()}<br/>
        OS version is: {electron.osVersion()}<br/>
        Arch is: {electron.arch()}<br/>
      </div>
    </div>
  );
};
