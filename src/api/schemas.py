"""
Modelos Pydantic para os contratos de entrada e saida da API.
Garante a validacao automatica e documentacao do Swagger.
"""

from pydantic import BaseModel
from typing import List

class LegendItem(BaseModel):
    """Modelo representando uma linha da legenda explicativa das colunas."""
    position: int
    label: str
    original: str

class NormalizationResponse(BaseModel):
    """Contrato de resposta da API com os metadados e o arquivo CSV final em string."""
    csv_content: str
    filename: str
    total_original_rows: int
    total_final_rows: int
    no_header: bool
    removed_no_phone: int
    removed_duplicates: int
    common_cols_count: int
    phone_cols_count: int
    name_col_detected: bool
    cpf_col_detected: bool
    legend: List[LegendItem]
    