"""
Camada de servico principal do Normalizador.
Orquestra a leitura em memoria, aplicacao das regras de dominio,
manipulacao de DataFrames com Pandas e geracao do artefato final.
"""

import io
from typing import Dict, Any, List, Tuple
import pandas as pd

from src.core import config
from src.domain import column_utils, column_selector, validators

SUPPORTED_ENCODINGS: List[str] = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]

def _seems_like_data_header(value: Any) -> bool:
    """Verifica se o cabeçalho parece ser um dado (CPF, Telefone, Email) para inferir ausência de cabeçalho."""
    text = str(value).strip()
    if not text or text.lower().startswith("unnamed"):
        return False
    if validators.is_email(text):
        return True
    digits = "".join(c for c in text if c.isdigit())
    return len(digits) >= 8

def _read_csv_bytes(file_bytes: bytes, header: Any = "infer") -> pd.DataFrame:
    """Tenta decodificar o CSV testando os encodings padroes do mercado brasileiro."""
    last_error = None
    for enc in SUPPORTED_ENCODINGS:
        try:
            return pd.read_csv(
                io.BytesIO(file_bytes), 
                dtype=str, 
                sep=None, 
                engine="python",
                encoding=enc, 
                header=header
            )
        except Exception as e:
            last_error = e
            continue
    raise ValueError(f"Falha ao ler o CSV. Encodings testados falharam. Erro original: {last_error}")

def parse_file_to_df(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, bool, Dict[str, str]]:
    """Carrega o arquivo em memoria e constroi o DataFrame inicial."""
    is_csv = filename.lower().endswith(".csv")

    # Leitura inicial para checar cabecalhos
    if is_csv:
        df = _read_csv_bytes(file_bytes)
    else:
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)

    # Identifica se a primeira linha e dado em vez de titulo
    suspicious_cols = sum(_seems_like_data_header(c) for c in df.columns)
    no_header = len(df.columns) > 0 and (suspicious_cols / len(df.columns)) >= 0.5

    # Re-leitura forçando ausência de cabeçalho se necessario
    if no_header:
        if is_csv:
            df = _read_csv_bytes(file_bytes, header=None)
        else:
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str, header=None)

    # Mapeamento de letras originais (A, B, C...) para nome da coluna
    original_letters = {df.columns[i]: column_utils.index_to_letter(i) for i in range(len(df.columns))}

    if no_header:
        df.columns = [f"Coluna {original_letters[c]}" for c in df.columns]
        original_letters = {df.columns[i]: column_utils.index_to_letter(i) for i in range(len(df.columns))}

    return df, no_header, original_letters

def process_spreadsheet(
    file_bytes: bytes, 
    filename: str, 
    ignore_str: str = "",
    concat_str: str = "",
    extras_str: str = "",
    manual_phone_str: str = ""
) -> Dict[str, Any]:
    """Processa as regras de negocio, higieniza os dados e gera o CSV final em string."""
    
    df, no_header, original_letters = parse_file_to_df(file_bytes, filename)
    
    if df.empty:
        raise ValueError("A planilha enviada está vazia.")

    total_original_rows = len(df)
    used_columns = set()
    
    # Prepara dicionario reverso para facilitar buscas
    letter_to_col = {letter: col for col, letter in original_letters.items()}

    # 1. Aplicar regras de colunas ignoradas
    if ignore_str:
        for letter in [s.strip().upper() for s in ignore_str.split(",") if s.strip()]:
            col = letter_to_col.get(letter)
            if col: used_columns.add(col)

    virtual_concat_cols = []
    
    # 2. Aplicar regras de concatenacao
    if concat_str:
        letters = [s.strip().upper() for s in concat_str.split(",") if s.strip()]
        if len(letters) > 1:
            col_names = []
            for letter in letters:
                col = letter_to_col.get(letter)
                if not col:
                    raise ValueError(f"A coluna '{letter}' informada para concatenação não existe.")
                col_names.append(col)
            
            new_col_name = f"CONCAT({'+'.join(letters)})"
            
            # Concatena os valores das colunas separando por espaco
            df[new_col_name] = df[col_names].apply(
                lambda row: " ".join(row.dropna().astype(str).str.strip().replace("nan", "")).strip(), 
                axis=1
            )
            
            original_letters[new_col_name] = new_col_name
            virtual_concat_cols.append({
                "name": new_col_name,
                "letters": letters
            })
        elif len(letters) == 1:
            raise ValueError("Para concatenar, selecione pelo menos 2 colunas.")

    # 3. Deteccao automatica de colunas basicas
    col_name = column_selector.select_name_column(df, used_columns)
    if col_name: used_columns.add(col_name)

    col_cpf = column_selector.select_cpf_column(df, used_columns)
    if col_cpf: used_columns.add(col_cpf)

    # 4. Adicao de colunas extras e concatenadas
    extra_cols = []
    for vc in virtual_concat_cols:
        extra_cols.append(vc["name"])
        used_columns.add(vc["name"])

    if extras_str:
        for letter in [s.strip().upper() for s in extras_str.split(",") if s.strip()]:
            col = letter_to_col.get(letter)
            if not col:
                raise ValueError(f"A coluna '{letter}' não existe na planilha.")
            if col not in used_columns:
                extra_cols.append(col)
                used_columns.add(col)

    # 5. Deteccao de telefones
    phone_cols = []
    if manual_phone_str:
        manual_letters = [s.strip().upper() for s in manual_phone_str.split(",") if s.strip()]
        
        # Regra de resolucao de conflito: Promove concat a telefone se as originais foram marcadas
        for vc in virtual_concat_cols:
            is_phone_target = any(l in manual_letters for l in vc["letters"])
            if is_phone_target:
                phone_cols.append(vc["name"])
                if vc["name"] in extra_cols:
                    extra_cols.remove(vc["name"])
                # Remove letras originais para nao duplicar separadamente
                manual_letters = [l for l in manual_letters if l not in vc["letters"]]
        
        for letter in manual_letters:
            col = letter_to_col.get(letter)
            if not col:
                raise ValueError(f"A coluna de telefone '{letter}' não existe.")
            phone_cols.append(col)
    else:
        phone_cols = column_selector.select_phone_columns(df, used_columns)

    if not phone_cols:
        raise ValueError("Nenhuma coluna de telefone detectada. Indique manualmente.")
    
    used_columns.update(phone_cols)

    # 6. Montagem do DataFrame final
    common_cols = [c for c in [col_name, col_cpf] if c] + extra_cols
    final_cols = common_cols + phone_cols
    df_final = df[final_cols].copy()

    # Normalizacao e limpeza
    for col in common_cols:
        df_final[col] = df_final[col].astype(str).str.strip().replace({"nan": "", "None": ""})
    
    for col in phone_cols:
        df_final[col] = df_final[col].apply(validators.normalize_phone)

    # Filtros e remocoes
    rows_before = len(df_final)
    df_final = df_final.dropna(subset=phone_cols, how="all")
    removed_no_phone = rows_before - len(df_final)

    rows_before_dedupe = len(df_final)
    df_final = df_final.drop_duplicates(subset=[phone_cols[0]], keep="first")
    removed_duplicates = rows_before_dedupe - len(df_final)

    # 7. Geracao do CSV em memoria
    csv_buffer = io.StringIO()
    df_final.to_csv(
        csv_buffer, 
        index=False, 
        header=False, 
        sep=config.OUTPUT_DELIMITER, 
        lineterminator=config.OUTPUT_LINE_BREAK
    )
    csv_content = csv_buffer.getvalue()

    ## 8. Montagem da Legenda
    legend = []
    pos = 1
    
    if col_name:
        legend.append({"position": pos, "label": "Nome", "original": f"{original_letters[col_name]} (\"{col_name}\")"})
        pos += 1
    if col_cpf:
        legend.append({"position": pos, "label": "CPF", "original": f"{original_letters[col_cpf]} (\"{col_cpf}\")"})
        pos += 1
    for c in extra_cols:
        is_concat = str(c).startswith("CONCAT")
        label = "Extra (Concatenada)" if is_concat else "Extra (pedida manualmente)"
        original_col = str(c) if is_concat else f"{original_letters[c]} (\"{c}\")"
        legend.append({"position": pos, "label": label, "original": original_col})
        pos += 1
    for i, c in enumerate(phone_cols, 1):
        is_concat = str(c).startswith("CONCAT")
        original_col = str(c) if is_concat else f"{original_letters[c]} (\"{c}\")"
        legend.append({"position": pos, "label": f"Telefone {i}", "original": original_col})
        pos += 1

    return {
        "csv_content": csv_content,
        "filename": filename.rsplit(".", 1)[0] + "_pronta",
        "total_original_rows": total_original_rows,
        "total_final_rows": len(df_final),
        "no_header": no_header,
        "removed_no_phone": removed_no_phone,
        "removed_duplicates": removed_duplicates,
        "common_cols_count": len(common_cols),
        "phone_cols_count": len(phone_cols),
        "name_col_detected": bool(col_name),
        "cpf_col_detected": bool(col_cpf),
        "legend": legend
    }
