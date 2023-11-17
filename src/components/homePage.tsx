// homePage.js

import React from 'react';
import { Header } from './header.tsx';

export const HomePage: React.FC = () => {
    return (
        <div className="App">
            <header className="App-header">
                <Header />
            </header>
            <div>
                Home Page
            </div>
        </div>
    );
};
