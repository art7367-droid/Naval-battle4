import { useState } from 'react';
import ShipDatabaseManager from './components/ShipDatabaseManager';

type AppScreen = 'menu' | 'database';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">⚓ Морской Бой</h1>
            <p className="text-xl text-blue-200">Тактическая игра WeGO</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => setScreen('database')} className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">📚 База данных кораблей</button>
            <button disabled className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-lg opacity-50 cursor-not-allowed">⚔️ Начать бой (скоро)</button>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400">
            <p>Версия с базой данных кораблей и редактором отсеков</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'database') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-cyan-300">📚 Управление базой данных</h1>
            <button onClick={() => setScreen('menu')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">← Назад в меню</button>
          </div>
          <ShipDatabaseManager />
        </div>
      </div>
    );
  }

  return null;
}
