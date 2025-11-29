// File: frontend/src/components/Auth.jsx
import { useState } from 'react';

function Auth({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState(''); // <--- 1. 新增状态
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // --- 登录 (不变) ---
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);

                const res = await fetch('/token', {
                    method: 'POST',
                    body: formData,
                });
                // ... (原有登录处理逻辑)
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.detail || '登录失败，请检查用户名或密码');
                }
                const data = await res.json();
                onLoginSuccess(data.access_token, username);

            } else {
                // --- 注册 (修改) ---
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // 2. 发送 invite_code
                    body: JSON.stringify({
                        username,
                        password,
                        invite_code: inviteCode
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.detail || '注册失败');
                }

                alert('🎉 注册成功！正在自动切换到登录...');
                setIsLogin(true);
                setPassword('');
                setInviteCode(''); // 清空注册码
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">
                    {isLogin ? '系统接入' : '新用户注册'}
                </h2>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>代号 (Username)</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            placeholder="输入你的特工代号"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label>密钥 (Password)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="输入你的安全密钥"
                            autoComplete="current-password"
                        />
                    </div>

                    {/* 3. 新增注册码输入框 (仅在注册模式下显示) */}
                    {!isLogin && (
                        <div className="form-group" style={{ animation: 'fadeIn 0.5s' }}>
                            <label style={{ color: 'var(--accent)' }}>邀请码 (Invite Code)</label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                required
                                placeholder="请输入管理员分发的邀请码"
                                autoComplete="off"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="refresh-btn"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '30px' }}
                        disabled={loading}
                    >
                        {loading ? '处理中...' : (isLogin ? '🚀 登入系统' : '📝 注册档案')}
                    </button>
                </form>

                <div className="auth-toggle">
                    {isLogin ? '还没有档案？' : '已有档案？'}
                    <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? '去注册' : '去登录'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default Auth;