// File: frontend/src/components/UploadModal.jsx
import { useState } from 'react';

function UploadModal({ onClose, token }) {
    const [formData, setFormData] = useState({
        title: '',
        question: '',
        answer: '',
        note: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/upload_puzzle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 发送 Token 进行验证
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || '上传失败');
            }

            alert('✅ 上传成功！感谢您的贡献，管理员审核后将录入题库。');
            onClose(); // 关闭窗口
        } catch (err) {
            alert('❌ 错误: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">📤 上传新汤面</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>标题 (Title)</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="例如：半夜的敲门声"
                        />
                    </div>

                    <div className="form-group">
                        <label>汤面 (Question)</label>
                        <textarea
                            name="question"
                            value={formData.question}
                            onChange={handleChange}
                            required
                            placeholder="描述这个奇怪的场景..."
                            style={{ minHeight: '100px' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>汤底 (Answer)</label>
                        <textarea
                            name="answer"
                            value={formData.answer}
                            onChange={handleChange}
                            required
                            placeholder="揭示背后的真相..."
                            style={{ minHeight: '120px' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>备注/提示 (Note) - 可选</label>
                        <input
                            type="text"
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="例如：这是一个关于误解的故事"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            取消
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? '传输中...' : '提交档案'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UploadModal;