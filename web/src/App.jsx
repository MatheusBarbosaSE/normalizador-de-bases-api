import React, { useState, useRef, useMemo } from 'react';
import { Play, Download, CheckSquare, UploadCloud } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const App = () => {
  const gridRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  
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
    if (file) setSelectedFile(file);
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 120,
    flex: 1,
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
          className="flex flex-col shrink-0"
          style={{
            width: 320,
            background: "var(--color-chrome-mid)",
            borderRight: "1px solid var(--color-chrome-border)",
          }}
        >
          {/* Seção de Upload Temporária (Será detalhada na Parte 2) */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--color-chrome-border)" }}>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
              Arquivo Base
            </div>
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="text-xs text-slate-400 w-full"
            />
          </div>

          {/* Seção de Parâmetros com Checkboxes Temporária */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--color-chrome-border)" }}>
            <div className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
              Parâmetros de Edição
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={activeOptions.useExtras}
                onChange={() => handleOptionToggle('useExtras')}
                style={{ accentColor: "var(--color-accent)" }}
              />
              <span className="text-sm" style={{ color: "var(--color-text-chrome)" }}>Manter colunas extras</span>
            </label>
            {activeOptions.useExtras && (
              <input 
                type="text" 
                name="extras"
                value={formValues.extras}
                onChange={handleValueChange}
                placeholder="Ex: D, F" 
                className="w-full px-2 py-1.5 mb-4 text-xs outline-none rounded"
                style={{ background: "var(--color-chrome-light)", color: "var(--color-text-chrome)", border: "1px solid var(--color-chrome-border)", fontFamily: "var(--font-mono)" }}
              />
            )}
          </div>
        </div>

        {/* Area do Grid Clara */}
        <div className="flex-1 overflow-auto relative outline-none p-4" style={{ background: "var(--color-cell-bg)" }}>
           <div className="h-full w-full border rounded shadow-sm ag-theme-quartz" style={{ borderColor: "var(--color-cell-border)" }}>
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
              />
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
