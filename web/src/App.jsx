import React, { useState, useRef, useMemo } from 'react';
import { Play, Download, UploadCloud, FileText, CheckSquare, Square, AlertCircle, Eye, Circle, CheckCircle2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { read, utils } from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Funcao auxiliar para converter indice numerico (0, 1, 2) para letra de coluna do Excel (A, B, C)
const getColumnLetter = (colIndex) => {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Funcao auxiliar usada apenas para a PRE-VISUALIZACAO (que possui cabecalho original)
const parseCSVPreview = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0 || !csvText) return { cols: [], rows: [], rawHeaders: [] };

  const separator = lines[0].includes(';') ? ';' : ',';
  
  const headers = lines[0].split(separator).map(h => h.trim());
  const cols = headers.map(h => ({ field: h, headerName: h, flex: 1, minWidth: 150 }));
  
  // Extrai cabeçalhos com suas respectivas letras
  const rawHeaders = headers.map((h, i) => ({ letter: getColumnLetter(i), name: h }));

  const rows = lines.slice(1).map(line => {
    const values = line.split(separator);
    const rowObj = {};
    headers.forEach((h, i) => {
      rowObj[h] = values[i] ? values[i].trim() : '';
    });
    return rowObj;
  });

  return { cols, rows, rawHeaders };
};

const App = () => {
  const gridRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewState, setViewState] = useState('empty');
  
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [rawCsv, setRawCsv] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]); // Armazena a lista de colunas para os checkboxes
  
  const [activeOptions, setActiveOptions] = useState({
    useExtras: false,
    useConcat: false,
    useIgnore: false,
    useManualPhone: false
  });

  // Atualizado para usar arrays (multipla escolha) e string (escolha unica para telefone)
  const [formValues, setFormValues] = useState({
    extras: [],
    concat: [],
    ignore: [],
    manualPhone: ''
  });

  const handleOptionToggle = (option) => {
    setActiveOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  // Funcao para gerenciar as selecoes de multiplas colunas
  const handleMultiColumnSelect = (field, letter) => {
    setFormValues(prev => {
      const currentList = prev[field];
      if (currentList.includes(letter)) {
        return { ...prev, [field]: currentList.filter(l => l !== letter) };
      } else {
        return { ...prev, [field]: [...currentList, letter] };
      }
    });
  };

  // Funcao para gerenciar a selecao unica (Radio Button)
  const handleSingleColumnSelect = (field, letter) => {
    setFormValues(prev => ({ ...prev, [field]: letter }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
      setViewState('preview');
      setRawCsv(null);
      
      // Reseta as selecoes anteriores
      setFormValues({ extras: [], concat: [], ignore: [], manualPhone: '' });
      setActiveOptions({ useExtras: false, useConcat: false, useIgnore: false, useManualPhone: false });

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (file.name.toLowerCase().endsWith('.csv')) {
             const text = new TextDecoder("utf-8").decode(e.target.result);
             const { cols, rows, rawHeaders } = parseCSVPreview(text);
             setColumnDefs(cols);
             setRowData(rows);
             setFileHeaders(rawHeaders);
             return;
          }

          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const json = utils.sheet_to_json(worksheet, { defval: '' });

          if (json.length > 0) {
            const headers = Object.keys(json[0]);
            const cols = headers.map(h => ({ field: h, headerName: h, flex: 1, minWidth: 150 }));
            
            const rawHeaders = headers.map((h, i) => ({ letter: getColumnLetter(i), name: h }));
            
            setColumnDefs(cols);
            setRowData(json);
            setFileHeaders(rawHeaders);
          } else {
            setColumnDefs([]);
            setRowData([]);
            setFileHeaders([]);
          }
        } catch (err) {
          setErrorMsg('Falha ao ler o arquivo para pré-visualização.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Converte as listas de volta para a string que a API Python espera (Ex: "A, C, D")
      formData.append('extras', activeOptions.useExtras ? formValues.extras.join(', ') : '');
      formData.append('concat', activeOptions.useConcat ? formValues.concat.join(', ') : '');
      formData.append('ignore', activeOptions.useIgnore ? formValues.ignore.join(', ') : '');
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
      
      setRawCsv(data.csv_content);

      const sortedLegend = data.legend.sort((a, b) => a.position - b.position);
      const headers = sortedLegend.map(col => col.label);
      const cols = headers.map(h => ({ field: h, headerName: h, flex: 1, minWidth: 150 }));

      const lines = data.csv_content.trim().split(/\r?\n/);
      const separator = lines.length > 0 && lines[0].includes(';') ? ';' : ',';
      
      const rows = lines.map(line => {
        if (!line.trim()) return null;
        const values = line.split(separator);
        const rowObj = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i] ? values[i].trim() : '';
        });
        return rowObj;
      }).filter(Boolean);

      setColumnDefs(cols);
      setRowData(rows);
      setViewState('processed');

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Componente interno para renderizar a lista de colunas dinamicamente
  const ColumnSelector = ({ type, field, isSingle = false }) => {
    if (fileHeaders.length === 0) return null;
    
    return (
      <div 
        className="mt-3 p-2 rounded max-h-40 overflow-y-auto flex flex-col gap-1"
        style={{ background: "var(--color-chrome-light)", border: "1px solid var(--color-chrome-border)" }}
      >
        {fileHeaders.map((header) => {
          const isSelected = isSingle ? formValues[field] === header.letter : formValues[field].includes(header.letter);
          
          return (
            <div 
              key={header.letter}
              className="flex items-center gap-3 p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--color-chrome-border)]"
              onClick={() => isSingle ? handleSingleColumnSelect(field, header.letter) : handleMultiColumnSelect(field, header.letter)}
            >
              {isSingle ? (
                isSelected ? <CheckCircle2 size={16} style={{ color: "var(--color-accent)" }} /> : <Circle size={16} style={{ color: "var(--color-text-muted)" }} />
              ) : (
                isSelected ? <CheckSquare size={16} style={{ color: "var(--color-accent)" }} /> : <Square size={16} style={{ color: "var(--color-text-muted)" }} />
              )}
              <span className="text-xs truncate font-medium" style={{ color: "var(--color-text-chrome)" }}>
                <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>{header.letter}</span>
                {header.name}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-full w-full overflow-hidden select-none" 
      style={{ fontFamily: "var(--font-ui)", background: "var(--color-chrome)" }}
    >
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

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col shrink-0 relative"
          style={{
            width: 340,
            background: "var(--color-chrome-mid)",
            borderRight: "1px solid var(--color-chrome-border)",
          }}
        >
          <div className="flex-1 overflow-y-auto pb-20">
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

            <div style={{ padding: "24px 20px" }}>
              <div className="text-xs font-semibold mb-4 tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
                Passo 2: Regras de Edição
              </div>
              
              <div className="flex flex-col gap-5">
                <div className="flex flex-col">
                  <div 
                    className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleOptionToggle('useExtras')}
                  >
                    {activeOptions.useExtras ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Manter colunas extras</span>
                  </div>
                  {activeOptions.useExtras && <ColumnSelector field="extras" />}
                </div>

                <div className="flex flex-col">
                  <div 
                    className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleOptionToggle('useConcat')}
                  >
                    {activeOptions.useConcat ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Concatenar colunas</span>
                  </div>
                  {activeOptions.useConcat && <ColumnSelector field="concat" />}
                </div>

                <div className="flex flex-col">
                  <div 
                    className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleOptionToggle('useIgnore')}
                  >
                    {activeOptions.useIgnore ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Ignorar colunas</span>
                  </div>
                  {activeOptions.useIgnore && <ColumnSelector field="ignore" />}
                </div>

                <div className="flex flex-col">
                  <div 
                    className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleOptionToggle('useManualPhone')}
                  >
                    {activeOptions.useManualPhone ? (
                      <CheckSquare size={18} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Forçar coluna de telefone</span>
                  </div>
                  {activeOptions.useManualPhone && <ColumnSelector field="manualPhone" isSingle={true} />}
                </div>
              </div>
            </div>
            
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

        <div className="flex-1 flex flex-col p-6" style={{ background: "var(--color-cell-bg)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--color-chrome-mid)" }}>
              {viewState === 'preview' && <><Eye size={20} className="text-slate-400"/> Pré-visualização (Original)</>}
              {viewState === 'processed' && 'Dados Processados'}
              {viewState === 'empty' && 'Visualizador'}
            </h2>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              style={{ 
                background: "var(--color-cell-header)", 
                color: "var(--color-chrome-mid)",
                border: "1px solid var(--color-cell-border)"
              }}
              disabled={viewState !== 'processed'}
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="flex-1 w-full h-full border rounded shadow-sm ag-theme-quartz" style={{ borderColor: "var(--color-cell-border)" }}>
            {viewState === 'empty' ? (
              <div className="h-full w-full flex flex-col items-center justify-center" style={{ background: "var(--color-cell-header)" }}>
                <FileText size={48} style={{ color: "var(--color-cell-border)", marginBottom: 16 }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Faça o upload do arquivo para visualizar os dados.
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