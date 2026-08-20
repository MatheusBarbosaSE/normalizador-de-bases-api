import React, { useState, useRef, useMemo } from 'react';
import { read, utils } from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Importacao dos componentes
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DataGridArea from './components/DataGridArea';

const getColumnLetter = (colIndex) => {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

const parseCSVPreview = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0 || !csvText) return { cols: [], rows: [], rawHeaders: [] };

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim());
  const cols = headers.map(h => ({ field: h, headerName: h, flex: 1, minWidth: 150 }));
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

  // Estados Globais
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewState, setViewState] = useState('empty');
  
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [rawCsv, setRawCsv] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  
  const [activeOptions, setActiveOptions] = useState({
    useExtras: false,
    useConcat: false,
    useIgnore: false,
    useManualPhone: false
  });

  const [formValues, setFormValues] = useState({
    extras: [],
    concat: [],
    ignore: [],
    manualPhone: ''
  });

  // Funcoes de Manipulacao de Estado
  const handleOptionToggle = (option) => {
    setActiveOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

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

  const handleSingleColumnSelect = (field, letter) => {
    setFormValues(prev => ({ ...prev, [field]: letter }));
  };

  // Funcoes de Negocio (Upload, Process, Download)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
      setViewState('preview');
      setRawCsv(null);
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

  return (
    <div 
      className="flex flex-col h-full w-full overflow-hidden select-none" 
      style={{ fontFamily: "var(--font-ui)", background: "var(--color-chrome)" }}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          selectedFile={selectedFile}
          handleFileChange={handleFileChange}
          activeOptions={activeOptions}
          handleOptionToggle={handleOptionToggle}
          formValues={formValues}
          fileHeaders={fileHeaders}
          handleSingleColumnSelect={handleSingleColumnSelect}
          handleMultiColumnSelect={handleMultiColumnSelect}
          isProcessing={isProcessing}
          errorMsg={errorMsg}
          handleProcess={handleProcess}
        />
        <DataGridArea 
          viewState={viewState}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          gridRef={gridRef}
          handleDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default App;
