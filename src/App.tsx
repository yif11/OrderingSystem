// // import { useState } from 'react'
// // import './App.css'

// // function App() {
// //   const [count, setCount] = useState(0)

// //   return (
// //     <>
// //       <h1 className="text-3xl font-bold underline">
// //         Hello world!
// //       </h1>
// //     </>
// //   )
// // }

// // export default App

// import React, { useState } from 'react';

// interface MenuItem {
//   name: string;
//   options?: string[];
//   quantity: number;
// }

// const App: React.FC = () => {
//   const [items, setItems] = useState<MenuItem[]>([
//     { name: 'Hot Coffee', quantity: 0 },
//     { name: 'Iced Coffee', quantity: 0 },
//     { name: 'Hot Tea', quantity: 0 },
//     { name: 'Iced Tea', quantity: 0 },
//     { name: 'Pancake', quantity: 0 },
//     { name: 'Croissant', quantity: 0 }
//   ]);

//   const updateQuantity = (index: number, quantity: number) => {
//     const newItems = [...items];
//     newItems[index].quantity = quantity;
//     setItems(newItems);
//   };

//   const handleSubmit = () => {
//     const orderedItems = items.filter(item => item.quantity > 0);
//     console.log('Your order:', orderedItems);
//     alert(`Your order has been submitted!`);
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
//       <h1 className="text-3xl font-bold mb-6">Cafe Order</h1>
//       <div className="w-full max-w-lg bg-white shadow-md rounded-lg p-6">
//         {items.map((item, index) => (
//           <div key={index} className="flex justify-between items-center mb-4">
//             <span className="text-lg">{item.name}</span>
//             <div className="flex items-center">
//               <button
//                 onClick={() => updateQuantity(index, Math.max(0, item.quantity - 1))}
//                 className="bg-red-500 text-white px-3 py-1 rounded-l"
//               >
//                 -
//               </button>
//               <span className="bg-gray-100 px-4 py-1">{item.quantity}</span>
//               <button
//                 onClick={() => updateQuantity(index, item.quantity + 1)}
//                 className="bg-green-500 text-white px-3 py-1 rounded-r"
//               >
//                 +
//               </button>
//             </div>
//           </div>
//         ))}
//         <button
//           onClick={handleSubmit}
//           className="mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
//         >
//           Submit Order
//         </button>
//       </div>
//     </div>
//   );
// };

// export default App;

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
