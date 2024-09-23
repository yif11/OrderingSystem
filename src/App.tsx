import React from 'react';
import KitchenView from './KitchenView';
import OrderInput from './OrderInput';
import ServedOrdersView from './ServedOrdersView';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Kitchen View</Link>
            </li>
            <li>
              <Link to="/order">Order Input</Link>
            </li>
            <li>
              <Link to="/served">Served Orders View</Link>
            </li>
          </ul>
        </nav>

        {/* ルーティングの設定 */}
        <Routes>
          <Route path="/" element={<KitchenView />} />
          <Route path="/order" element={<OrderInput />} />
          <Route path="/served" element={<ServedOrdersView />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
