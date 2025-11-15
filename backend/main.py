import os
from typing import Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from typing_extensions import TypedDict

from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage


# ============================
# Configuração básica
# ============================

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Defina a variável de ambiente OPENAI_API_KEY")

# Modelo de chat da OpenAI (sem Azure)
llm = ChatOpenAI(
    model="gpt-4o",  # ajuste para o modelo que você tiver acesso
    temperature=0.1,
)

# Carrega o prompt de sistema em markdown
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompt_guardiao_beneficios.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


# ============================
# LangGraph - estado do chat
# ============================

class ChatState(TypedDict):
    messages: List[BaseMessage]


def call_model(state: ChatState) -> ChatState:
    """Nó único do grafo: chama o LLM com o histórico de mensagens."""
    response = llm.invoke(state["messages"])
    return {"messages": [*state["messages"], response]}


graph = StateGraph(ChatState)
graph.add_node("model", call_model)
graph.set_entry_point("model")
graph.set_finish_point("model")

compiled_graph = graph.compile()


# ============================
# FastAPI app
# ============================

app = FastAPI(title="Guardião dos Benefícios API")
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS para permitir o frontend em localhost durante desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em produção, restrinja para o domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Memória simples em RAM por sessão
conversations: Dict[str, List[BaseMessage]] = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatMessage(BaseModel):
    role: str  # "user" ou "assistant"
    content: str


class ChatResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]


def to_simple_messages(msgs: List[BaseMessage]) -> List[ChatMessage]:
    simple: List[ChatMessage] = []
    for m in msgs:
        if isinstance(m, SystemMessage):
            # Não devolve o system para o frontend
            continue
        role = "assistant" if isinstance(m, AIMessage) else "user"
        simple.append(ChatMessage(role=role, content=m.content))
    return simple


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Endpoint principal de chat.
    - Usa session_id para manter contexto.
    - Usa LangGraph para chamar o modelo com o histórico.
    """

    session_id = req.session_id

    # Recupera histórico ou inicia com o SystemMessage do prompt
    if session_id not in conversations:
        conversations[session_id] = [SystemMessage(content=SYSTEM_PROMPT)]

    history = conversations[session_id]

    # Adiciona nova mensagem do usuário
    history.append(HumanMessage(content=req.message))

    # Invoca o grafo
    result_state = compiled_graph.invoke({"messages": history})

    # Atualiza histórico na memória
    conversations[session_id] = result_state["messages"]

    # Converte para um formato simples para o frontend
    simple_msgs = to_simple_messages(result_state["messages"])

    return ChatResponse(session_id=session_id, messages=simple_msgs)


# Para rodar localmente:
#   uvicorn main:app --reload --host 0.0.0.0 --port 8000
