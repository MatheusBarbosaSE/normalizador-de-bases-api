import React from 'react';
import { Play, UploadCloud, FileText, CheckSquare, Square, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';

const Sidebar = ({
  selectedFile,
  handleFileChange,
  activeOptions,
  handleOptionToggle,
  formValues,
  fileHeaders,
  handleSingleColumnSelect,
  handleMultiColumnSelect,
  isProcessing,
  errorMsg,
  handleProcess
}) => {
  
  // Sub-componente interno apenas para a Sidebar
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
      className="flex flex-col shrink-0 relative"
      style={{
        width: 340,
        background: "var(--color-chrome-mid)",
        borderRight: "1px solid var(--color-chrome-border)",
      }}
    >
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Upload Area */}
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

        {/* Options Area */}
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
                {activeOptions.useExtras ? <CheckSquare size={18} style={{ color: "var(--color-accent)" }} /> : <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />}
                <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Manter colunas extras</span>
              </div>
              {activeOptions.useExtras && <ColumnSelector field="extras" />}
            </div>

            <div className="flex flex-col">
              <div 
                className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleOptionToggle('useConcat')}
              >
                {activeOptions.useConcat ? <CheckSquare size={18} style={{ color: "var(--color-accent)" }} /> : <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />}
                <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Concatenar colunas</span>
              </div>
              {activeOptions.useConcat && <ColumnSelector field="concat" />}
            </div>

            <div className="flex flex-col">
              <div 
                className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleOptionToggle('useIgnore')}
              >
                {activeOptions.useIgnore ? <CheckSquare size={18} style={{ color: "var(--color-accent)" }} /> : <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />}
                <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Ignorar colunas</span>
              </div>
              {activeOptions.useIgnore && <ColumnSelector field="ignore" />}
            </div>

            <div className="flex flex-col">
              <div 
                className={`flex items-center gap-3 cursor-pointer group ${!selectedFile ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleOptionToggle('useManualPhone')}
              >
                {activeOptions.useManualPhone ? <CheckSquare size={18} style={{ color: "var(--color-accent)" }} /> : <Square size={18} style={{ color: "var(--color-text-muted)" }} className="group-hover:text-slate-300 transition-colors" />}
                <span className="text-sm font-medium" style={{ color: "var(--color-text-chrome)" }}>Forçar coluna de telefone</span>
              </div>
              {activeOptions.useManualPhone && <ColumnSelector field="manualPhone" isSingle={true} />}
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {errorMsg && (
          <div className="mx-5 mb-4 p-3 rounded flex gap-2 items-start" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--color-danger)" }}>
            <AlertCircle size={16} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} />
            <span className="text-xs" style={{ color: "var(--color-danger)" }}>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Process Button */}
      <div 
        className="absolute bottom-0 left-0 w-full p-4"
        style={{ background: "var(--color-chrome-mid)", borderTop: "1px solid var(--color-chrome-border)" }}
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
  );
};

export default Sidebar;
