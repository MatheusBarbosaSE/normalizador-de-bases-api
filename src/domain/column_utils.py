"""
Utilitarios para manipulacao de colunas e textos.
Fornece conversoes entre notacao de planilha (ex: 'A', 'AA') 
e indices base zero, alem de funcoes de apoio.
"""

import unicodedata
import pandas as pd

def letter_to_index(letter: str) -> int:
    """Converte uma letra de coluna Excel (A, B, AA) para indice numérico base zero."""
    letter = letter.strip().upper()
    index = 0
    for char in letter:
        if not ("A" <= char <= "Z"):
            raise ValueError(f"Invalid column letter: '{letter}'")
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1

def index_to_letter(index: int) -> str:
    """Converte um indice numerico base zero para letra de coluna Excel (0 -> A, 26 -> AA)."""
    index += 1
    letter = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letter = chr(65 + remainder) + letter
    return letter

def remove_accents(text: str) -> str:
    """Remove acentuacao de strings mantendo os caracteres base."""
    return "".join(
        char for char in unicodedata.normalize("NFD", str(text))
        if unicodedata.category(char) != "Mn"
    )

def calculate_fill_rate(series: pd.Series) -> float:
    """Calcula a taxa de preenchimento (nao-nulos e nao-vazios) de uma Serie Pandas."""
    total = len(series)
    if total == 0:
        return 0.0
    filled = series.dropna().astype(str).str.strip().ne("").sum()
    return filled / total
    