// File: frontend/src/components/Game.jsx
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';

function Game({ puzzle, onBack, model }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [turnCount, setTurnCount] = useState(0);

    // 控制手机端汤面面板的显示状态
    const [showMobilePuzzle, setShowMobilePuzzle] = useState(false);

    const [stats, setStats] = useState({
        lastTokens: 0,
        lastCost: 0.0,
        totalCost: 0.0
    });

    const threadIdRef = useRef(uuidv4());
    const chatEndRef = useRef(null);

    // 自动滚动到底部
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 初始化游戏
    useEffect(() => {
        // 1. 设置欢迎语
        setMessages([{
            role: 'ai',
            content: `你好！我是本局的海龟汤主持人。\n\n**当前接入**: \`${model}\`\n\n请阅读左侧的汤面，然后向我提问。卡关时可以向我索要提示。猜出真相了请以"真相："开头描述你的复盘。`
        }]);
        setStats({ lastTokens: 0, lastCost: 0.0, totalCost: 0.0 });
        setTurnCount(0);

        // 2. 调用后端初始化
        fetch('/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                thread_id: threadIdRef.current,
                story: puzzle.question,
                truth: puzzle.answer,
                model: model
            })
        }).catch(err => console.error("API Error", err));

    }, [puzzle, model]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();

        // 立即显示用户消息
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thread_id: threadIdRef.current,
                    message: userText
                })
            });
            const data = await res.json();

            // 显示 AI 回复
            setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);

            if (data.turn_count) setTurnCount(data.turn_count);

            // 更新 Token 统计
            if (data.cost_data) {
                setStats(prev => ({
                    lastTokens: data.cost_data.tokens,
                    lastCost: data.cost_data.cost,
                    totalCost: prev.totalCost + data.cost_data.cost
                }));
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'system', content: "❌ 发送失败，请检查后端。" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="game-container game-active">

            {/* --- 左侧 (移动端为全屏模态框)：题目区域 --- */}
            <div className={`puzzle-section ${showMobilePuzzle ? 'mobile-show' : ''}`}>

                {/* 移动端汤面内的关闭按钮 */}
                <button
                    className="mobile-toggle-btn close-puzzle"
                    onClick={() => setShowMobilePuzzle(false)}
                >
                    ✕ 收起汤面
                </button>

                <div className="puzzle-card">
                    {/* PC端显示的返回按钮 (移动端通过CSS隐藏) */}
                    <div className="controls" style={{ marginTop: 0, marginBottom: 10 }}>
                        <button className="btn-back" onClick={onBack}>← 返回大厅</button>
                    </div>

                    <div className="puzzle-title">{puzzle.title}</div>
                    <div className="puzzle-content">{puzzle.question}</div>

                    {showAnswer && (
                        <div className="answer-section show" style={{ display: 'block' }}>
                            <strong style={{ color: 'var(--accent)' }}>汤底：</strong>
                            <p style={{ marginTop: 10 }}>{puzzle.answer}</p>
                        </div>
                    )}

                    <div className="controls">
                        <button className="btn-reveal" onClick={() => setShowAnswer(!showAnswer)}>
                            {showAnswer ? '🙈 隐藏汤底' : '👁 偷看汤底'}
                        </button>
                    </div>
                </div>

                {/* 监控面板 */}
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{
                        color: 'var(--accent)',
                        fontWeight: 'bold',
                        marginBottom: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>⚡ 链路监控</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '4px' }}>{model}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>本轮 Token:</span>
                        <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{stats.lastTokens}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>本轮费用:</span>
                        <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>${stats.lastCost.toFixed(5)}</span>
                    </div>
                    <div style={{
                        borderTop: '1px dashed rgba(255,255,255,0.15)',
                        marginTop: '5px',
                        paddingTop: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>累计总耗:</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '1rem', fontWeight: 'bold' }}>
                            ${stats.totalCost.toFixed(5)}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- 右侧：聊天区域 --- */}
            <div className="chat-section">
                <div className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>

                        {/* 1. [新增] 移动端专属：退出按钮 (红色) */}
                        <button
                            className="mobile-toggle-btn mobile-back"
                            onClick={onBack}
                        >
                            ← 退出
                        </button>

                        {/* 2. 移动端专属：查看汤面按钮 (黄色) */}
                        <button
                            className="mobile-toggle-btn open-puzzle"
                            onClick={() => setShowMobilePuzzle(true)}
                        >
                            📜 汤面
                        </button>

                        {/* PC端显示的标题，移动端隐藏 */}
                        <span className="header-title-text">主持人大脑</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>第 {turnCount} 轮</span>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role === 'user' ? 'msg-user' : msg.role === 'ai' ? 'msg-ai' : 'msg-system'}`}>
                            {msg.role === 'ai' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="typing-indicator" style={{ display: 'block' }}>
                            <span></span><span></span><span></span>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="输入你的问题..."
                        autoComplete="off"
                    />
                    <button className="btn-send" onClick={handleSend}>➤</button>
                </div>
            </div>
        </div>
    );
}

export default Game;