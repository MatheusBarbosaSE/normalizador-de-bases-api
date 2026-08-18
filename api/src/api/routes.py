"""
Definicao das rotas (endpoints) da API.
Responsavel por interceptar as requisicoes HTTP, desempacotar os dados
e repassar o processamento para a camada de servicos.
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException

from src.api.schemas import NormalizationResponse
from src.services.normalizer_service import process_spreadsheet

router = APIRouter()

@router.post("/normalize", response_model=NormalizationResponse)
async def normalize_file(
    file: UploadFile = File(...),
    extras: str = Form(""),
    concat: str = Form(""),
    ignore: str = Form(""),
    manual_phone: str = Form("")
):
    """
    Recebe o arquivo (.csv, .xlsx, .xls) e os parametros de ajuste,
    processa a planilha em memoria e retorna o resultado higienizado.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only .csv, .xlsx, or .xls are accepted."
        )

    try:
        file_bytes = await file.read()
        
        result_dict = process_spreadsheet(
            file_bytes=file_bytes,
            filename=file.filename,
            ignore_str=ignore,
            concat_str=concat,
            extras_str=extras,
            manual_phone_str=manual_phone
        )
        
        return result_dict

    except ValueError as val_error:
        # Trata erros previstos da regra de negocio (ex: coluna nao existe)
        raise HTTPException(status_code=400, detail=str(val_error))
    
    except Exception as exc:
        # Captura falhas catastroficas ou de sistema
        raise HTTPException(status_code=500, detail=f"Internal processing error: {str(exc)}")
    