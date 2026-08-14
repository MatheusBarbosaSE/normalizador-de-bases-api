"""
Ponto de entrada do servidor ASGI.
Configura a inicializacao do FastAPI, middlewares (CORS) e mapeia as rotas.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router as normalizer_router

app = FastAPI(
    title="API Normalizador de Bases",
    description="API REST para processamento e higienizacao de bases de discadora",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conecta as rotas definidas na pasta api/
app.include_router(normalizer_router, prefix="/api", tags=["Normalization"])

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Verifica se o servidor esta online e responsivo."""
    return {"status": "online", "message": "API Normalizador operante."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    