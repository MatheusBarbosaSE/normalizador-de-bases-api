import React from 'react';
import { Download, FileText, Eye } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';

const DataGridArea = ({ 
  viewState, 
  rowData, 
  columnDefs, 
  defaultColDef, 
  gridRef, 
  handleDownload 
}) => {
  return (
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
  );
};

export default DataGridArea;
