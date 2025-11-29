// File: frontend/src/components/Menu.jsx
import { useState, useEffect } from 'react';
import { PUZZLE_DATA, AVAILABLE_MODELS } from '../data';
import UploadModal from './UploadModal'; // 导入新创建的上传组件

function Menu({ onStartGame, user, onLogout, selectedModel, onSelectModel }) {
    const [puzzles, setPuzzles] = useState([]);
    const [showUpload, setShowUpload] = useState(false); // 控制上传弹窗显示状态

    // 初始化时加载题目
    useEffect(() => {
        refreshPuzzles();
    }, []);

    // 随机刷新题目逻辑
    const refreshPuzzles = () => {
        // 随机打乱并取前6个，保持界面整洁
        const shuffled = [...PUZZLE_DATA].sort(() => 0.5 - Math.random());
        setPuzzles(shuffled.slice(0, 6));
    };

    // 显示所有题目
    const handleViewAll = () => setPuzzles(PUZZLE_DATA);

    // 打开上传弹窗
    const handleUpload = () => {
        setShowUpload(true);
    };

    return (
        <div className="menu-container">
            {/* --- 右上角用户信息栏 --- */}
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
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                >
                    退出
                </button>
            </div>

            {/* --- 页面头部 --- */}
            <header className="menu-header">
                <div className="menu-title">TURTLE SOUP</div>
                <div className="menu-subtitle">海龟汤 v0.0.1</div>

                {/* --- 模型选择区域 (包含价格显示) --- */}
                <div style={{ marginTop: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 1s' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', letterSpacing: '1px' }}>
                        NEURAL LINK:
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedModel}
                            onChange={(e) => onSelectModel(e.target.value)}
                            style={{
                                padding: '10px 15px',
                                paddingRight: '35px',
                                borderRadius: '8px',
                                background: 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid var(--accent)',
                                color: 'var(--accent)',
                                outline: 'none',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                appearance: 'none', // 移除默认箭头
                                minWidth: '350px',  // 加宽以容纳价格文字
                                boxShadow: '0 0 10px var(--accent-glow)',
                                fontFamily: 'monospace' // 使用等宽字体让价格对齐更好看
                            }}
                        >
                            {AVAILABLE_MODELS.map(m => (
                                <option
                                    key={m.id}
                                    value={m.id}
                                    style={{ background: '#1e293b', color: '#e2e8f0' }}
                                >
                                    {/* 格式: 名称 [标签] - $输入/$输出 */}
                                    {m.name}
                                    {m.isNew ? ' (NEW)' : ''}
                                    {m.cost ? ` — $${m.cost.in}/$${m.cost.out}` : ''}
                                </option>
                            ))}
                        </select>
                        {/* 自定义下拉箭头 */}
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', pointerEvents: 'none' }}>
                            ▼
                        </span>
                    </div>
                </div>

                {/* --- 操作按钮区域 --- */}
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

            {/* --- 题目卡片网格 --- */}
            <div className="cards-grid">
                {puzzles.map((p, index) => (
                    <div key={index} className="menu-card" onClick={() => onStartGame(p)}>
                        <h3>{p.title || '无题档案'}</h3>
                        <p>{p.question.length > 60 ? p.question.substring(0, 60) + "..." : p.question}</p>
                    </div>
                ))}
            </div>

            {/* --- 底部状态栏 --- */}
            <div style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '0.8rem' }}>
                SYSTEM STATUS: ONLINE | {puzzles.length} ENTRIES LOADED
            </div>

            {/* --- 上传弹窗组件 (条件渲染) --- */}
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    token={user?.token} // 将 token 传递给 Modal 用于鉴权
                />
            )}
        </div>
    );
}

export default Menu;