"""
Logica de inferencia automatica de colunas.
Utiliza os validadores de dominio e amostragem de dados para 
determinar o papel de cada coluna na planilha original.
"""

from typing import Optional
import pandas as pd

from src.core import config
from src.domain import validators
from src.domain.column_utils import remove_accents, calculate_fill_rate

def _matches_keyword(column_name: str, keywords: list[str]) -> bool:
    """Verifica se o nome da coluna contem alguma das palavras-chave."""
    normalized_name = remove_accents(str(column_name)).lower()
    return any(keyword in normalized_name for keyword in keywords)

def _get_valid_sample(series: pd.Series) -> pd.Series:
    """Extrai uma amostra de dados validos para analise de inferencia."""
    sample = series.dropna().astype(str)
    sample = sample[sample.str.strip() != ""]
    return sample.head(config.SAMPLE_SIZE)

def select_name_column(df: pd.DataFrame, used_columns: set) -> Optional[str]:
    """Tenta identificar a coluna de Nome via cabecalho ou heuristica de texto."""
    available = [col for col in df.columns if col not in used_columns]

    # Tentativa 1: Inferencia por nome de cabecalho
    header_candidates = [col for col in available if _matches_keyword(col, config.NAME_KEYWORDS)]
    if header_candidates:
        return max(header_candidates, key=lambda c: calculate_fill_rate(df[c]))

    # Tentativa 2: Inferencia baseada em analise do conteudo
    content_candidates = []
    for col in available:
        sample = _get_valid_sample(df[col])
        if sample.empty:
            continue

        text_rate = sample.apply(validators.is_text).mean()
        cpf_rate = sample.apply(validators.is_cpf).mean()
        phone_rate = sample.apply(validators.is_phone).mean()
        email_rate = sample.apply(validators.is_email).mean()

        # Garante que a coluna e predominante texto e evita colapsar com cidades/emails
        if (
            text_rate >= config.TEXT_THRESHOLD
            and cpf_rate < 0.3
            and phone_rate < 0.3
            and email_rate < 0.3
        ):
            content_candidates.append((col, text_rate))

    if content_candidates:
        return max(content_candidates, key=lambda item: item[1])[0]

    return None

def select_cpf_column(df: pd.DataFrame, used_columns: set) -> Optional[str]:
    """Identifica a coluna de CPF analisando os dados em busca de padroes validos."""
    available = [col for col in df.columns if col not in used_columns]

    candidates = []
    for col in available:
        sample = _get_valid_sample(df[col])
        if sample.empty:
            continue
        cpf_rate = sample.apply(validators.is_cpf).mean()
        if cpf_rate >= config.CPF_THRESHOLD:
            candidates.append((col, cpf_rate))

    if not candidates:
        return None

    # Desempate priorizando cabecalhos sugestivos
    header_candidates = [col for col, _ in candidates if _matches_keyword(col, config.CPF_KEYWORDS)]
    if header_candidates:
        return header_candidates[0]

    return max(candidates, key=lambda item: item[1])[0]

def select_phone_columns(df: pd.DataFrame, used_columns: set) -> list[str]:
    """Identifica todas as colunas que possuem altas taxas de telefones validos."""
    available = [col for col in df.columns if col not in used_columns]

    candidates = []
    for col in available:
        sample = _get_valid_sample(df[col])
        if sample.empty:
            continue
        phone_rate = sample.apply(validators.is_phone).mean()
        if phone_rate >= config.PHONE_THRESHOLD:
            candidates.append((col, phone_rate, calculate_fill_rate(df[col])))

    # Ordena prioritariamente por taxa de acerto e secundariamente por preenchimento
    candidates.sort(key=lambda item: (item[1], item[2]), reverse=True)
    return [col for col, _, _ in candidates[:config.MAX_PHONE_COLUMNS]]
