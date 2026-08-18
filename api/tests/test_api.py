"""
Testes de integracao para a API REST.
Garante que os endpoints recebem arquivos multipart/form-data,
acionam o servico interno e retornam as respostas (status codes e JSON) corretas.
"""

from fastapi.testclient import TestClient

from src.main import app

# Instancia o cliente de testes oficial do FastAPI
client = TestClient(app)

def test_health_check():
    """Verifica se o servidor esta aceitando conexoes e retornando status 200."""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "online", "message": "API Normalizador operante."}

def test_normalize_valid_csv_in_memory():
    """
    Simula o upload de um arquivo CSV em memoria e as variaveis de formulario.
    Valida se o motor de regras removeu a linha invalida e retornou o JSON correto.
    """
    # Cria o conteudo do CSV em texto.
    # Precisamos de pelo menos 70% de acerto para a heuristica aceitar a coluna de telefone.
    # Colocamos 3 validos e 1 invalido (Maria) = 75% de acerto.
    csv_content = (
        "Nome,CPF,Telefone,Cidade\n"
        "Joao Silva,123.456.789-00,(11) 98765-4321,Sao Paulo\n"
        "Pedro Santos,222.222.222-22,(11) 91234-5678,Osasco\n"
        "Ana Clara,333.333.333-33,(11) 99876-5432,Guarulhos\n"
        "Maria Souza,11111111111,(20) 1234-5678,Campinas\n"  # Invalido
    ).encode("utf-8")

    files = {
        "file": ("planilha_cliente.csv", csv_content, "text/csv")
    }
    
    form_data = {
        "extras": "D",
        "concat": "",
        "ignore": "",
        "manual_phone": ""
    }

    response = client.post("/api/normalize", files=files, data=form_data)
    
    assert response.status_code == 200
    
    result = response.json()
    
    assert result["filename"] == "planilha_cliente_pronta"
    assert result["total_original_rows"] == 4
    
    # A Maria deve ser removida
    assert result["total_final_rows"] == 3 
    assert result["removed_no_phone"] == 1
    
    assert result["name_col_detected"] is True
    assert result["cpf_col_detected"] is True
    
    assert "csv_content" in result
    assert "Joao Silva" in result["csv_content"]
    assert "Maria Souza" not in result["csv_content"]
    
def test_normalize_invalid_file_extension():
    """Garante que a API rejeita arquivos que nao sejam planilhas."""
    txt_content = b"Nome,Telefone\nTeste,11999999999"
    files = {"file": ("documento.pdf", txt_content, "application/pdf")}
    
    response = client.post("/api/normalize", files=files)
    
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]
