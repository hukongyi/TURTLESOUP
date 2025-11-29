// File: frontend/src/App.jsx
import { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import Auth from './components/Auth';
import './index.css';
import { AVAILABLE_MODELS } from './data'; // 导入模型列表以设置默认值

function App() {
  const [view, setView] = useState('loading'); // 增加一个 loading 状态防止闪烁
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [user, setUser] = useState(null);

  // 新增：模型选择状态，默认选择列表中的第一个，或者指定一个默认值
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]?.id || 'gemini-2.5-flash');

  useEffect(() => {
    // 页面加载时检查登录状态
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (token && username) {
      setUser({ token, username });
      setView('menu'); // 已登录 -> 去菜单
    } else {
      setUser(null);
      setView('auth'); // 未登录 -> 去登录页
    }
  }, []);

  const handleLoginSuccess = (token, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUser({ token, username });
    setView('menu'); // 登录成功跳转
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
    setCurrentPuzzle(null);
    setView('auth'); // 退出后强制回到登录页
  };

  const handleStartGame = (puzzle) => {
    setCurrentPuzzle(puzzle);
    setView('game');
  };

  // 防止初始加载时的闪烁
  if (view === 'loading') {
    return null;
  }

  return (
    <div className="app-container">
      {view === 'auth' && (
        <Auth onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'menu' && (
        <Menu
          onStartGame={handleStartGame}
          user={user}
          onLogout={handleLogout}
          // 传递模型控制 Props
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      )}

      {view === 'game' && currentPuzzle && (
        <Game
          puzzle={currentPuzzle}
          model={selectedModel} // 将选中的模型传递给游戏组件
          onBack={() => setView('menu')}
        />
      )}
    </div>
  );
}

export default App;