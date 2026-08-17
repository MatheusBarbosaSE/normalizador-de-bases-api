"""
Testes unitários para as regras de validação de domínio.
Garante que as detecções de telefones, CPFs e textos estejam estritamente em conformidade
com os requisitos de negócio definidos na configuração principal.
"""

from src.domain import validators

def test_clean_to_digits():
    """Testa a extração de apenas caracteres numéricos de uma string."""
    assert validators.clean_to_digits("(11) 98765-4321") == "11987654321"
    assert validators.clean_to_digits("CPF: 123.456.789-00") == "12345678900"
    assert validators.clean_to_digits(None) == ""

def test_normalize_phone_valid_mobile():
    """Testa formatos válidos de telefone celular (11 dígitos, DDD válido, começando com 9)."""
    # Entrada padrão
    assert validators.normalize_phone("11987654321") == "11987654321"
    # Com caracteres especiais
    assert validators.normalize_phone("(11) 98765-4321") == "11987654321"
    # Com DDI (+55)
    assert validators.normalize_phone("+55 11 98765-4321") == "11987654321"
    # Com zero à esquerda
    assert validators.normalize_phone("011987654321") == "11987654321"

def test_normalize_phone_valid_landline():
    """Testa formatos válidos de telefone fixo (10 dígitos, DDD válido)."""
    assert validators.normalize_phone("(11) 4002-8922") == "1140028922"

def test_normalize_phone_invalid():
    """Testa entradas de telefone inválidas que devem retornar None."""
    # DDD inválido (ex: 20 não existe no Brasil)
    assert validators.normalize_phone("20987654321") is None
    # Celular sem o '9' obrigatório após o DDD
    assert validators.normalize_phone("11887654321") is None
    # Muito curto
    assert validators.normalize_phone("12345") is None

def test_is_cpf_valid_format():
    """Testa bypass do formato padrão de string de CPF (comumente usado em testes/homologação)."""
    assert validators.is_cpf("000.000.000-00") is True

def test_is_cpf_invalid():
    """Testa números e formatos de CPF inválidos."""
    # Algoritmo matemático incorreto (enviado sem máscara para forçar a validação matemática)
    assert validators.is_cpf("12345678900") is False
    # Números sequenciais são inválidos
    assert validators.is_cpf("11111111111") is False
    # Muito curto
    assert validators.is_cpf("123456") is False

def test_is_text():
    """Testa a lógica que infere se uma string é predominantemente texto."""
    assert validators.is_text("MARIA DA SILVA") is True
    assert validators.is_text("RUA DAS FLORES 123") is True
    assert validators.is_text("123456789") is False
    assert validators.is_text(None) is False

def test_is_email():
    """Testa a detecção do formato padrão de e-mail."""
    assert validators.is_email("cliente@fasttelecom.com.br") is True
    assert validators.is_email("invalid-email.com") is False
    assert validators.is_email("11987654321") is False
    