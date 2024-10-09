import React from 'react';
import KitchenView from './KitchenView';
import OrderInput from './OrderInput';
import ServedOrdersView from './ServedOrdersView';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import './App.css'; 

const App: React.FC = () => {
  return (
    <Router>
      <div>
        {/* ヘッダー */}
        <header className="header">
          <nav>
            <ul className="nav-list">
              <li className="nav-item">
                <Link to="/" className='font-bold'>キッチン画面</Link>
              </li>
              <li className="nav-item">
                <Link to="/order" className='font-bold'>注文画面</Link>
              </li>
              <li className="nav-item">
                <Link to="/served" className='font-bold'>提供済み</Link>
              </li>
            </ul>
          </nav>
        </header>

        {/* メインコンテンツエリア */}
        <main className="main">
          <Routes>
            <Route path="/" element={<KitchenView />} />
            <Route path="/order" element={<OrderInput />} />
            <Route path="/served" element={<ServedOrdersView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
