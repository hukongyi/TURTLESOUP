// File: frontend/src/App.jsx
import { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import Auth from './components/Auth';
import './index.css';

function App() {
  // 核心修改：默认 view 取决于是否有本地存储的 token
  const [view, setView] = useState('loading'); // 增加一个 loading 状态防止闪烁
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [user, setUser] = useState(null);

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
        />
      )}

      {view === 'game' && currentPuzzle && (
        <Game
          puzzle={currentPuzzle}
          onBack={() => setView('menu')}
        />
      )}
    </div>
  );
}

export default App;