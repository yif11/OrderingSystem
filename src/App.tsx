import React from 'react';
import KitchenView from './components/KitchenView';
import OrderInput from './components/OrderInput';
import ServedOrdersView from './components/ServedOrdersView';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import Icon from './components/Icon';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">メインコンテンツへ</a>
        <header className="app-header">
          <div className="header-inner">
            <NavLink to="/order" className="brand" aria-label="注文システム 注文受付へ">
              <span className="brand-mark"><Icon name="coffee" /></span>
              <strong>注文システム</strong>
            </NavLink>
            <nav className="main-nav" aria-label="メインナビゲーション">
              <NavLink to="/order"><Icon name="receipt" /><span>注文受付</span></NavLink>
              <NavLink to="/" end><Icon name="kitchen" /><span>キッチン</span></NavLink>
              <NavLink to="/served"><Icon name="check" /><span>提供済み</span></NavLink>
            </nav>
          </div>
        </header>
        <main id="main-content" className="main-content">
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
