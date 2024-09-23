import React from 'react';
import OrderInput from './OrderInput';
import KitchenView from './KitchenView';
import ServedOrdersView from './ServedOrdersView';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold mb-6">Cafe Ordering System</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <OrderInput />
        <KitchenView />
        <ServedOrdersView />
      </div>
    </div>
  );
};

export default App;
