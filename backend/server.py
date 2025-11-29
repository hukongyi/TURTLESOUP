import os
import sys
import asyncio
from datetime import datetime, timedelta
from typing import TypedDict, List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

# --- Database & Auth Imports (New) ---
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt

# Langchain imports... (保留你原有的导入)
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_community.callbacks import get_openai_callback

load_dotenv(dotenv_path=r"./.env", override=True)

# --- 配置与常量 (New) ---
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS"  # 请在生产环境中修改
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

# --- 数据库设置 (New) ---
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

MODEL_PRICING = {
    "gemini-2.5-flash": {"input": 0.3000, "output": 2.5200},
    "gemini-2.5-pro": {"input": 1.2500, "output": 10.00},
    "gemini-3-pro-preview": {"input": 2.0000, "output": 12.000},
    "gpt-4o": {"input": 5.0000, "output": 20.00},
    "gpt-5.1": {"input": 2.5000, "output": 20.00},
    "deepseek-ai/DeepSeek-V3.2-Exp": {"input": 0.2000, "output": 0.300},
    "deepseek-ai/DeepSeek-V3.2-Exp-thinking": {"input": 0.2000, "output": 0.300},
}


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class InviteCode(Base):
    __tablename__ = "invite_codes"
    code = Column(String, primary_key=True, index=True)
    is_used = Column(Boolean, default=False)


Base.metadata.create_all(bind=engine)  # 自动创建表


def init_invite_codes():
    """如果数据库中没有注册码，生成几个默认的"""
    db = SessionLocal()
    try:
        if db.query(InviteCode).count() == 0:
            default_codes = ["TURTLE_HKY"]
            print(f"\n--- 初始化注册码 ---")
            for code in default_codes:
                db_code = InviteCode(code=code)
                db.add(db_code)
                print(f"生成的可用注册码: {code}")
            db.commit()
            print("-------------------\n")
    finally:
        db.close()


init_invite_codes()


# --- 安全工具 (New) ---
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# 依赖项：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Pydantic Models (New & Existing) ---
class UserCreate(BaseModel):
    username: str
    password: str
    invite_code: str  # <--- 2. 新增字段


class Token(BaseModel):
    access_token: str
    token_type: str


class InitRequest(BaseModel):
    thread_id: str
    story: str
    truth: str
    model: str = "gemini-2.5-flash"


class ChatRequest(BaseModel):
    thread_id: str
    message: str


def create_llm_instance(model_name: str):
    api_key = os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("BASE_URL")
    if not api_key or not base_url:
        raise ValueError("Check .env")

    # 动态实例化
    return ChatOpenAI(
        model=model_name, api_key=api_key, base_url=base_url, temperature=0.3
    )


if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 1. 定义 Prompt 模板 (核心修改) ---

HOST_PROMPT = """
# Role: 海龟汤主持人

你是一个严谨且富有悬疑感的侧向思维解谜游戏（海龟汤）主持人。你的目标是引导用户通过提问还原故事真相。

## 游戏数据
### [汤面] (公开给用户的故事)
{story}

### [汤底] (绝对机密，仅供判断使用)
{truth}

## 当前状态
### 用户已确认的信息 (摘要)
{summary}

### [近期对话上下文]
{recent_history}

### 用户当前输入
{user_question}

## 任务指令
请分析用户的输入意图，并严格按以下优先级逻辑分支进行回复：

### 分支 1：用户请求提示
**触发条件**：用户明确询问“有没有提示？”、“给个提示”、“卡住了”或“hint”。
**执行逻辑**：
1. 对比 [汤底] 和 [用户已确认的信息]。
2. 找出一个用户尚未触及、但对解开谜题至关重要的**关键线索**（如：人物关系、作案动机、物理环境、关键物品）。
3. 生成一个**隐晦的引导**。不要直接告诉答案，而是引导思考方向。
   - *错误示范*：“提示：他是自杀的。”（太直白）
   - *正确示范*：“提示：你注意到了他提到的那个包裹，但你是否考虑过包裹里装的东西和他的职业有什么联系？”
   - *正确示范*：“提示：试试从‘声音’这个角度去提问。”

### 分支 2：试图还原真相（猜测汤底）
**触发条件**：用户输入以 **“真相：”** 或 **“真相:”** 开头（例如：“真相：是因为他杀了人...”）。
**执行逻辑**：
1. 提取“真相：”后面的内容，将其与 [汤底] 进行比对。
2. **完全猜对**：涵盖核心诡计、因果逻辑、关键细节（相似度>80%）。
   - 回复：“🎉 **恭喜你，猜对了！** \n\n真相是：{truth}”
3. **非常接近**：核心诡计正确，但缺少关键细节。
   - 回复：“**非常接近了！** 大方向是对的，但在 [指出具体的错误点或缺失点] 上还需要再推敲一下。”
4. **猜错**：核心逻辑错误。
   - 回复：“很遗憾，这不是真相。请继续提问。”

### 分支 3：复合提问（一次问多个问题）
**触发条件**：一个输入中包含多个独立问题。
**执行逻辑**：
- 务必**逐条回答**，严禁合并。
- 格式：“1. 是的。 2. 不是。 3. 与此无关。”

### 分支 4：普通提问
**触发条件**：常规的“是/否”提问。
**执行逻辑**：依据 [汤底] 严格判断：
1. **是**：与汤底事实一致。
   - *特殊技巧*：如果是关键信息，可回复“是（这是关键点）”。
2. **不是**：与汤底事实相反。
3. **无关**：提问内容在故事中不存在，或对解谜无逻辑帮助。
4. **是又不是**：问题包含正确和错误的部分，或存在歧义（需用户澄清）。

## 注意事项
- **严禁剧透**：除非用户触发 [分支 2] 且猜对，否则绝不能直接输出完整汤底。
- **语气控制**：保持客观、简练，不要废话。
- **前缀识别**：对于 [分支 2]，必须严格检查“真相：”前缀，没有前缀的即使是一段长描述，也尽量按普通提问（是/否）处理，或者提示用户“如果你想猜测真相，请以‘真相：’开头”。

请直接输出回复内容。
"""

SUMMARY_PROMPT = """
# Role: 游戏记录员

你需要根据“汤面”、“汤底”以及用户最近的“问答记录”，更新用户目前的推理进度摘要。

## 游戏数据
### [汤面]
{story}

### [汤底]
{truth}

## 输入数据
### 之前的摘要
{summary}

### 最近 10 轮问答记录
{recent_history}

## 任务指令
请整合 [之前的摘要] 和 [最近 10 轮问答记录]，生成一个新的、简练的**“已知线索清单”**。
1. **筛选有效信息**：只保留用户已经猜对（主持人回答“是”）的关键事实。
2. **记录排除项**：如果用户排除了重要的错误路径（主持人回答“不是”），简要记录。
3. **严禁剧透**：不要把用户还没猜出来的汤底细节写进摘要。

请直接输出一段纯文本摘要。
"""

# --- 2. LangGraph State ---


class GameState(TypedDict):
    story: str
    truth: str
    history: List[BaseMessage]
    summary: str
    turn_count: int
    model: str  # <--- 存入 State
    last_cost: float  # <--- 存入单次费用
    last_tokens: int  # <--- 存入单次Token


# --- 3. 节点逻辑 ---


def host_node(state: GameState):
    """主持人回答节点"""
    current_history_msgs = state.get("history", [])
    summary = state.get("summary", "暂无信息")
    selected_model = state.get("model", "gpt-3.5-turbo")  # 获取用户选择的模型

    if not current_history_msgs:
        return {}

    last_message = current_history_msgs[-1]
    user_question = last_message.content

    # 2. 提取之前的对话作为上下文 (排除掉最新这一条用户提问)
    previous_msgs = current_history_msgs[:-1]
    recent_history_text = ""
    display_msgs = previous_msgs[-20:] if len(previous_msgs) > 20 else previous_msgs
    if not display_msgs:
        recent_history_text = "（暂无近期对话）"
    else:
        for msg in display_msgs:
            role = "用户" if isinstance(msg, HumanMessage) else "主持人"
            recent_history_text += f"{role}: {msg.content}\n"

    # 1. 动态获取 LLM
    llm_instance = create_llm_instance(selected_model)

    prompt = ChatPromptTemplate.from_template(HOST_PROMPT)
    chain = prompt | llm_instance

    print(f"\n--- Turn {state['turn_count'] + 1} [{selected_model}] ---")
    print(f"User Question: {user_question}")

    # 2. 使用 Callback 捕获 Token
    with get_openai_callback() as cb:
        response = chain.invoke(
            {
                "story": state["story"],
                "truth": state["truth"],
                "summary": summary,
                "recent_history": recent_history_text,
                "user_question": user_question,
            }
        )

        # 3. 计算实际费用 (LangChain 自带计算通常基于官方价，如果你用中转且价格不同，可手动算)
        # 这里演示手动计算以匹配 MODEL_PRICING 配置
        pricing = MODEL_PRICING.get(selected_model, {"input": 0, "output": 0})
        input_cost = (cb.prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (cb.completion_tokens / 1_000_000) * pricing["output"]
        total_cost = input_cost + output_cost

        print(f"Host Reply: {response.content}")
        print(
            f"Tokens: {cb.total_tokens} (In: {cb.prompt_tokens}, Out: {cb.completion_tokens})"
        )
        print(f"Cost: ${total_cost:.6f}")

    new_history = current_history_msgs + [response]

    return {
        "history": new_history,
        "turn_count": state["turn_count"] + 1,
        "last_cost": total_cost,  # 更新状态
        "last_tokens": cb.total_tokens,
    }


def summarize_node(state: GameState):
    """总结节点"""
    summary = state.get("summary", "暂无信息")
    history_msgs = state["history"]

    # 将对话记录转为文本
    history_text = ""
    for msg in history_msgs:
        role = "用户" if isinstance(msg, HumanMessage) else "主持人"
        history_text += f"{role}: {msg.content}\n"

    prompt = ChatPromptTemplate.from_template(SUMMARY_PROMPT)
    chain = prompt | llm

    response = chain.invoke(
        {
            "story": state["story"],
            "truth": state["truth"],
            "summary": summary,
            "recent_history": history_text,
        }
    )

    print(f"\n>>> 触发自动总结: {response.content} <<<\n")

    # 总结后，我们可以选择保留一定数量的 history 或者是清空 history
    # 既然有了 summary，为了节省 token，我们可以清空之前的 history
    # 但保留最后 2 条以保持对话连贯性（可选）

    return {
        "summary": response.content,
        "history": [],
    }  # 简单起见，清空历史列表，依赖 summary


# --- 4. 构建图 ---


def should_summarize(state: GameState):
    # 每 10 轮触发一次总结 (稍微频繁一点，以便summary更新及时)
    if state["turn_count"] > 0 and state["turn_count"] % 10 == 0:
        return "summarize"
    return END


workflow = StateGraph(GameState)

workflow.add_node("host", host_node)
workflow.add_node("summarizer", summarize_node)

workflow.set_entry_point("host")

workflow.add_conditional_edges(
    "host", should_summarize, {"summarize": "summarizer", END: END}
)
workflow.add_edge("summarizer", END)

memory = MemorySaver()
app_graph = workflow.compile(checkpointer=memory)

# --- 5. API 接口 ---


class InitRequest(BaseModel):
    thread_id: str
    story: str
    truth: str


class ChatRequest(BaseModel):
    thread_id: str
    message: str


@app.post("/register", status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # A. 校验用户是否存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # B. 校验注册码
    db_code = db.query(InviteCode).filter(InviteCode.code == user.invite_code).first()

    if not db_code:
        raise HTTPException(status_code=400, detail="Invalid registration code")

    if db_code.is_used:
        raise HTTPException(
            status_code=400, detail="Registration code has already been used"
        )

    # C. 标记注册码为已使用 (如果你希望注册码只能用一次)
    # 如果希望注册码无限次使用，注释掉下面这行:
    db_code.is_used = True

    # D. 创建用户
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}


@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me")
async def read_users_me(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return {"username": user.username, "id": user.id}


@app.post("/init")
async def init_game(req: InitRequest):
    config = {"configurable": {"thread_id": req.thread_id}}

    # 校验模型是否存在，不存在则回退
    model_to_use = req.model if req.model in MODEL_PRICING else "gpt-3.5-turbo"

    initial_state = {
        "story": req.story,
        "truth": req.truth,
        "history": [],
        "summary": "游戏开始。",
        "turn_count": 0,
        "model": model_to_use,  # 保存模型选择
        "last_cost": 0.0,
        "last_tokens": 0,
    }
    print(f"New Game Initialized with Model: {model_to_use}")
    app_graph.update_state(config, initial_state)
    return {"status": "ok", "message": "Game initialized", "model": model_to_use}


@app.post("/chat")
async def chat(req: ChatRequest):
    config = {"configurable": {"thread_id": req.thread_id}}

    current_state_dict = app_graph.get_state(config).values
    current_history = current_state_dict.get("history", [])

    new_message = HumanMessage(content=req.message)
    inputs = {"history": current_history + [new_message]}

    ai_reply = ""

    # 执行图
    async for event in app_graph.astream(inputs, config=config):
        if "host" in event:
            msgs = event["host"]["history"]
            if msgs:
                ai_reply = msgs[-1].content

    # 获取最新状态 (包含了 host_node 计算的 cost)
    final_state = app_graph.get_state(config).values

    return {
        "reply": ai_reply,
        "summary": final_state.get("summary", ""),
        "turn_count": final_state.get("turn_count", 0),
        # 返回费用信息
        "cost_data": {
            "tokens": final_state.get("last_tokens", 0),
            "cost": final_state.get("last_cost", 0.0),
            "model": final_state.get("model", "unknown"),
        },
    }


@app.get("/puzzles")
async def get_puzzles():
    """获取所有题目列表"""
    puzzles = []
    puzzles_dir = os.path.join(os.getcwd(), "puzzles")
    print(f"Searching for puzzles in: {puzzles_dir}")

    if not os.path.exists(puzzles_dir):
        print(f"Directory not found: {puzzles_dir}")
        return []

    import json

    for filename in os.listdir(puzzles_dir):
        if filename.endswith(".json"):
            try:
                with open(
                    os.path.join(puzzles_dir, filename), "r", encoding="utf-8"
                ) as f:
                    data = json.load(f)
                    # 确保包含必要字段
                    if "title" in data and "question" in data:
                        puzzles.append(data)
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    return puzzles


if __name__ == "__main__":
    import uvicorn

    print("Server starting on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
