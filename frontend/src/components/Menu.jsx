// File: frontend/src/components/Menu.jsx
import { useState, useEffect } from 'react';
import { PUZZLE_DATA } from '../data';

function Menu({ onStartGame, user, onLogout }) {
    const [puzzles, setPuzzles] = useState([]);

    useEffect(() => {
        refreshPuzzles();
    }, []);

    const refreshPuzzles = () => {
        const shuffled = [...PUZZLE_DATA].sort(() => 0.5 - Math.random());
        setPuzzles(shuffled.slice(0, 6));
    };

    const handleViewAll = () => setPuzzles(PUZZLE_DATA);

    const handleUpload = () => {
        alert(`侦测到用户 [${user.username}] 尝试上传数据。\n后端上行链路尚未建立。`);
    };

    return (
        <div className="menu-container">
            {/* 用户状态栏 */}
            <div style={{ position: 'absolute', top: '30px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 'bold' }}>AGENT</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem' }}>{user?.username}</div>
                </div>
                <button
                    onClick={onLogout}
                    style={{
                        padding: '8px 15px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#ddd',
                        borderRadius: '8px'
                    }}
                >
                    退出
                </button>
            </div>

            <header className="menu-header">
                <div className="menu-title">TURTLE SOUP</div>
                <div className="menu-subtitle">海龟汤 v0.0.1</div>

                <div className="menu-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                    <button className="refresh-btn" onClick={refreshPuzzles}>
                        <span>↻</span> 换一批
                    </button>
                    <button className="refresh-btn" onClick={handleViewAll} style={{ borderColor: '#4a90e2', color: '#4a90e2' }}>
                        <span>📚</span> 完整题库
                    </button>
                    <button className="refresh-btn" onClick={handleUpload} style={{ borderColor: '#50c878', color: '#50c878' }}>
                        <span>📤</span> 上传汤面
                    </button>
                </div>
            </header>

            <div className="cards-grid">
                {puzzles.map((p, index) => (
                    <div key={index} className="menu-card" onClick={() => onStartGame(p)}>
                        <h3>{p.title || '无题档案'}</h3>
                        <p>{p.question.length > 60 ? p.question.substring(0, 60) + "..." : p.question}</p>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '0.8rem' }}>
                SYSTEM STATUS: ONLINE | {puzzles.length} ENTRIES LOADED
            </div>
        </div>
    );
}

export default Menu;