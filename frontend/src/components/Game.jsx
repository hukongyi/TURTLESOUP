import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown'; // 替代 marked.js
import { v4 as uuidv4 } from 'uuid'; // 替代手写的 generateUUID

function Game({ puzzle, onBack }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [turnCount, setTurnCount] = useState(0);

    // 使用 useRef 保存 thread_id，因为它不需要触发重新渲染
    const threadIdRef = useRef(uuidv4());
    // 用于自动滚动到底部
    const chatEndRef = useRef(null);

    // 初始化游戏 (对应原来的 startGame 中的 fetch)
    useEffect(() => {
        // 1. 添加欢迎语
        setMessages([{
            role: 'ai',
            content: '你好！我是本局的海龟汤主持人。请阅读左侧的汤面，然后向我提问。'
        }]);

        // 2. 调用后端初始化
        fetch('/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                thread_id: threadIdRef.current,
                story: puzzle.question,
                truth: puzzle.answer
            })
        }).catch(err => console.error("API Error", err));

    }, [puzzle]); // 当 puzzle 变化时重新执行

    // 自动滚动到底部
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // 发送消息
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        // 添加用户消息
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

            // 添加 AI 回复
            setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
            if (data.turn_count) setTurnCount(data.turn_count);

        } catch (e) {
            setMessages(prev => [...prev, { role: 'system', content: "❌ 发送失败，请检查后端。" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="game-container game-active" style={{ display: 'flex', opacity: 1, transform: 'scale(1)' }}>

            {/* 左侧：题目区域 */}
            <div className="puzzle-section">
                <div className="puzzle-card">
                    <div className="controls" style={{ marginTop: 0, marginBottom: 10 }}>
                        <button className="btn-back" onClick={onBack}>← 返回大厅</button>
                    </div>

                    <div className="puzzle-title">{puzzle.title}</div>
                    <div className="puzzle-content">{puzzle.question}</div>

                    {/* 汤底区域：使用条件渲染控制显示 */}
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
            </div>

            {/* 右侧：聊天区域 */}
            <div className="chat-section">
                <div className="chat-header">
                    <span>主持人大脑</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>第 {turnCount} 轮</span>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role === 'user' ? 'msg-user' : msg.role === 'ai' ? 'msg-ai' : 'msg-system'}`}>
                            {/* 如果是 AI 消息，使用 Markdown 渲染 */}
                            {msg.role === 'ai' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="typing-indicator" style={{ display: 'block' }}>
                            <span></span><span></span><span></span>
                        </div>
                    )}
                    {/* 用于自动滚动的锚点 */}
                    <div ref={chatEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="输入你的问题... (回车发送)"
                        autoComplete="off"
                    />
                    <button className="btn-send" onClick={handleSend}>➤</button>
                </div>
            </div>
        </div>
    );
}

export default Game;