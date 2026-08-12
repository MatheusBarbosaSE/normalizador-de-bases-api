"""
Configuracoes e constantes globais do sistema.
Centralizar essas variaveis facilita a manutencao e ajustes finos
sem necessidade de alterar a logica de negocio.
"""

MAX_PHONE_COLUMNS: int = 6
MIN_PHONE_LENGTH: int = 10
MAX_PHONE_LENGTH: int = 11

# DDDs oficiais em uso no Brasil (ANATEL).
VALID_DDDS: frozenset = frozenset({
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55,
    61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
})

# Palavras-chave usadas na deteccao de colunas baseadas em cabecalhos
NAME_KEYWORDS: list[str] = ["nome", "cliente", "titular", "razao social", "consumidor", "devedor"]
CPF_KEYWORDS: list[str] = ["cpf"]

# Limiares de acerto para inferencia do tipo de dado na amostragem
TEXT_THRESHOLD: float = 0.6
CPF_THRESHOLD: float = 0.7
PHONE_THRESHOLD: float = 0.7

# Quantidade de valores nao-nulos analisados para determinar o tipo da coluna
SAMPLE_SIZE: int = 200

# Delimitadores e configuracoes do arquivo de saida (CSV)
OUTPUT_DELIMITER: str = ";"
OUTPUT_LINE_BREAK: str = "\r\n"
