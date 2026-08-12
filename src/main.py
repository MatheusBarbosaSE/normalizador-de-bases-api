from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Inicializa a aplicacao FastAPI
app = FastAPI(
    title="API Normalizador de Bases",
    description="API REST para processamento e higienizacao de bases de discadora",
    version="1.0.0"
)

# Configura o CORS para permitir que o front-end (HTML/JS) consuma a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Verifica se o servidor esta online.
    """
    return {"status": "online", "message": "API Normalizador operante."}

if __name__ == "__main__":
    import uvicorn
    # Inicia o servidor ASGI para desenvolvimento local com auto-reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    