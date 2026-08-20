import React, { useState, useRef, useMemo } from 'react';
import { Play, Download, UploadCloud, FileText, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Funcao auxiliar para converter a string CSV do Back-end no formato exigido pelo AG Grid
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { cols: [], rows: [] };

  const headers = lines[0].split(',');
  const cols = headers.map(h => ({ field: h, headerName: h, flex: 1 }));

  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const rowObj = {};
    headers.forEach((h, i) => {
      rowObj[h] = values[i] ? values[i].trim() : '';
    });
    return rowObj;
  });

  return { cols, rows };
};

const App = () => {
  const gridRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [rawCsv, setRawCsv] = useState(null); // Armazena a string original para o download
  
  const [activeOptions, setActiveOptions] = useState({
    useExtras: false,
    useConcat: false,
    useIgnore: false,
    useManualPhone: false
  });

  const [formValues, setFormValues] = useState({
    extras: '',
    concat: '',
    ignore: '',
    manualPhone: ''
  });

  const handleOptionToggle = (option) => {
    setActiveOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const handleValueChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  // Funcao principal que dispara a requisicao para a API Python
  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Envia os parametros apenas se o checkbox correspondente estiver ativo
      formData.append('extras', activeOptions.useExtras ? formValues.extras : '');
      formData.append('concat', activeOptions.useConcat ? formValues.concat : '');
      formData.append('ignore', activeOptions.useIgnore ? formValues.ignore : '');
      formData.append('manual_phone', activeOptions.useManualPhone ? formValues.manualPhone : '');

      const response = await fetch('http://localhost:8000/api/normalize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Falha ao processar base no servidor.');
      }

      const data = await response.json();
      
      // Salva o texto bruto para o momento da exportacao
      setRawCsv(data.csv_content);

      // Converte o texto em estrutura de grid para visualizacao
      const { cols, rows } = parseCSV(data.csv_content);
      setColumnDefs(cols);
      setRowData(rows);

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Gera um arquivo fisico na memoria do navegador e forca o download
  const handleDownload = () => {
    if (!rawCsv) return;
    
    const blob = new Blob([rawCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'base_higienizada.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 120,
  }), []);

  return (
    <div 
      className="flex flex-col h-full w-full overflow-hidden select-none" 
      style={{ fontFamily: "var(--font-ui)", background: "var(--color-chrome)" }}
    >
      {/* Barra Superior */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 42,
          background: "var(--color-chrome)",
          borderBottom: "1px solid var(--color-chrome-border)",
        }}
      >
        <div className="flex items-center gap-2 mr-2">
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 22, height: 22, background: "var(--color-accent)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" fill="white" opacity="0.9" />
              <rect x="7" y="1" width="4" height="4" fill="white" opacity="0.6" />
              <rect x="1" y="7" width="4" height="4" fill="white" opacity="0.6" />
              <rect x="7" y="7" width="4" height="4" fill="white" opacity="0.9" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-text-chrome)" }}>
            Normalizador API
          </span>
        </div>
      </div>

      {/* Area Principal */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Painel Lateral Escuro */}
        <div
          className="flex flex-col shrink-0 relative"
          style={{
            width: 320,
            background: "var(--color-chrome-mid)",
            borderRight: "1px solid var(--color-chrome-border)",
          }}
        >
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Secao de Upload */}
            <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--color-chrome-border)" }}>
              <div className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
                Passo 1: Arquivo Base
              </div>
              
              <label 
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all"
                style={{
                  borderColor: selectedFile ? "var(--color-accent)" : "var(--color-chrome-border)",
                  background: selectedFile ? "var(--color-selection)" : "var(--color-chrome-light)",
                }}
              >
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center text-center">
                    <FileText size={28} style={{ color: "var(--color-accent)", marginBottom: 12 }} />
                    <span className="text-sm font-semibold truncate w-48" style={{ color: "var(--color-text-chrome)" }}>
                      {selectedFile.name}
                    </span>
                    <span className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                      Clique para substituir
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <UploadCloud size={28} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>
                      Selecionar Planilha
                    </span>
                    <span className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                      Formatos suportados: .CSV, .XLSX
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Secao de Parametros */}
            <div style={{ padding: "24px 20px" }}>
              <div className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
                Passo 2: Regras de Edição
              </div>
              
              <div className="flex flex-col gap-4">
                
                <div className="flex flex-col">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => handleOptionToggle('useExtras')}
                  >
                    {activeOptions.useExtras ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Manter colunas extras</span>
                  </div>
                  {activeOptions.useExtras && (
                    <input 
                      type="text" 
                      name="extras"
                      value={formValues.extras}
                      onChange={handleValueChange}
                      placeholder="Colunas (Ex: D, F)" 
                      className="mt-3 px-3 py-2 text-sm outline-none rounded"
                      style={{ 
                        background: "var(--color-chrome-light)", 
                        color: "var(--color-text-chrome)", 
                        border: "1px solid var(--color-accent-dim)", 
                        fontFamily: "var(--font-mono)" 
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-col">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => handleOptionToggle('useConcat')}
                  >
                    {activeOptions.useConcat ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Concatenar colunas</span>
                  </div>
                  {activeOptions.useConcat && (
                    <input 
                      type="text" 
                      name="concat"
                      value={formValues.concat}
                      onChange={handleValueChange}
                      placeholder="Colunas (Ex: A, B)" 
                      className="mt-3 px-3 py-2 text-sm outline-none rounded"
                      style={{ 
                        background: "var(--color-chrome-light)", 
                        color: "var(--color-text-chrome)", 
                        border: "1px solid var(--color-accent-dim)", 
                        fontFamily: "var(--font-mono)" 
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-col">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => handleOptionToggle('useIgnore')}
                  >
                    {activeOptions.useIgnore ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Ignorar colunas</span>
                  </div>
                  {activeOptions.useIgnore && (
                    <input 
                      type="text" 
                      name="ignore"
                      value={formValues.ignore}
                      onChange={handleValueChange}
                      placeholder="Colunas (Ex: C)" 
                      className="mt-3 px-3 py-2 text-sm outline-none rounded"
                      style={{ 
                        background: "var(--color-chrome-light)", 
                        color: "var(--color-text-chrome)", 
                        border: "1px solid var(--color-accent-dim)", 
                        fontFamily: "var(--font-mono)" 
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-col">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => handleOptionToggle('useManualPhone')}
                  >
                    {activeOptions.useManualPhone ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Forçar coluna de telefone</span>
                  </div>
                  {activeOptions.useManualPhone && (
                    <input 
                      type="text" 
                      name="manualPhone"
                      value={formValues.manualPhone}
                      onChange={handleValueChange}
                      placeholder="Coluna (Ex: G)" 
                      className="mt-3 px-3 py-2 text-sm outline-none rounded"
                      style={{ 
                        background: "var(--color-chrome-light)", 
                        color: "var(--color-text-chrome)", 
                        border: "1px solid var(--color-accent-dim)", 
                        fontFamily: "var(--font-mono)" 
                      }}
                    />
                  )}
                </div>

              </div>
            </div>
            
            {/* Mensagem de Erro da API */}
            {errorMsg && (
              <div className="mx-5 mb-4 p-3 rounded flex gap-2 items-start" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--color-danger)" }}>
                <AlertCircle size={16} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} />
                <span className="text-xs" style={{ color: "var(--color-danger)" }}>{errorMsg}</span>
              </div>
            )}
            
          </div>

          <div 
            className="absolute bottom-0 left-0 w-full p-4"
            style={{ 
              background: "var(--color-chrome-mid)", 
              borderTop: "1px solid var(--color-chrome-border)" 
            }}
          >
            <button 
              onClick={handleProcess}
              className="w-full flex items-center justify-center gap-2 py-3 rounded text-sm font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: "var(--color-accent)", color: "#ffffff" }}
              disabled={!selectedFile || isProcessing}
            >
              <Play size={16} fill="currentColor" />
              {isProcessing ? 'Processando...' : 'Processar Base'}
            </button>
          </div>
        </div>

        {/* Area do Grid Clara */}
        <div className="flex-1 flex flex-col p-6" style={{ background: "var(--color-cell-bg)" }}>
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-chrome-mid)" }}>Dados Processados</h2>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              style={{ 
                background: "var(--color-cell-header)", 
                color: "var(--color-chrome-mid)",
                border: "1px solid var(--color-cell-border)"
              }}
              disabled={rowData.length === 0}
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="flex-1 border rounded shadow-sm ag-theme-quartz" style={{ borderColor: "var(--color-cell-border)" }}>
            {rowData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center" style={{ background: "var(--color-cell-header)" }}>
                <FileText size={48} style={{ color: "var(--color-cell-border)", marginBottom: 16 }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Faça o upload e preencha as regras opcionais para iniciar.
                </p>
              </div>
            ) : (
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
