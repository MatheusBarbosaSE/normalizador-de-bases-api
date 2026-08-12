"""
Funcoes de validacao puras e regras de dominio.
Nao possuem dependencias externas de framework e validam
apenas valores unitarios (cell-level).
"""

import re
from typing import Any, Optional
import pandas as pd

from src.core import config

def clean_to_digits(value: Any) -> str:
    """Remove todos os caracteres que nao sejam digitos de um valor."""
    if pd.isna(value):
        return ""
    return re.sub(r"\D", "", str(value))

def normalize_phone(value: Any) -> Optional[str]:
    """
    Valida e normaliza um numero de telefone brasileiro (mantendo apenas o DDD e o numero).
    Retorna None se o padrao nao corresponder a um telefone valido.
    """
    digits = clean_to_digits(value)
    if not digits:
        return None

    # Remove o prefixo internacional (55) caso presente
    if digits.startswith("55") and len(digits) in (config.MIN_PHONE_LENGTH + 2, config.MAX_PHONE_LENGTH + 2):
        digits = digits[2:]

    # Remove o '0' inicial padrao de discagem
    if len(digits) in (config.MIN_PHONE_LENGTH + 1, config.MAX_PHONE_LENGTH + 1) and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) not in (config.MIN_PHONE_LENGTH, config.MAX_PHONE_LENGTH):
        return None

    ddd = int(digits[:2])
    if ddd not in config.VALID_DDDS:
        return None

    # Regra ANATEL: Celulares (11 digitos) devem obrigatoriamente iniciar com '9' apos o DDD
    if len(digits) == config.MAX_PHONE_LENGTH and digits[2] != "9":
        return None

    return digits

def is_phone(value: Any) -> bool:
    """Verifica se o valor em questao representa um telefone valido."""
    return normalize_phone(value) is not None

def _calculate_cpf_digit(partial_cpf: str) -> str:
    """Algoritmo de calculo do digito verificador de CPF."""
    weight = len(partial_cpf) + 1
    total = sum(int(digit) * (weight - idx) for idx, digit in enumerate(partial_cpf))
    remainder = (total * 10) % 11
    return "0" if remainder == 10 else str(remainder)

def is_valid_cpf_algorithm(digits: str) -> bool:
    """Aplica o algoritmo oficial para validar um CPF real."""
    if len(digits) != 11 or digits == digits[0] * 11:
        return False

    dv1 = _calculate_cpf_digit(digits[:9])
    dv2 = _calculate_cpf_digit(digits[:9] + dv1)
    return digits[-2:] == dv1 + dv2

def is_cpf(value: Any) -> bool:
    """
    Considera valido tanto CPFs matematicamente reais quanto mascaras
    comuns de testes (000.000.000-00), cobrindo bases reais e de homologacao.
    """
    digits = clean_to_digits(value)
    if len(digits) != 11:
        return False

    text_val = str(value).strip()
    has_cpf_format = bool(re.match(r"^\d{3}\.\d{3}\.\d{3}-\d{2}$", text_val))
    
    return is_valid_cpf_algorithm(digits) or has_cpf_format

def is_text(value: Any) -> bool:
    """Avalia se a string e predominantemente composta por letras."""
    if pd.isna(value):
        return False
    text_val = str(value).strip()
    if not text_val:
        return False
    letters = sum(c.isalpha() for c in text_val)
    return letters / max(len(text_val), 1) > 0.5

def is_email(value: Any) -> bool:
    """Validacao simples via regex para capturar formato de email basico."""
    if pd.isna(value):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", str(value).strip()))
