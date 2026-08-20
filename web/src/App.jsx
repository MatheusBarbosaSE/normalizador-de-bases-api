import React, { useState, useRef, useMemo } from 'react';
import { read, utils } from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DataGridArea from './components/DataGridArea';

// Converte índice numérico para letra de coluna (ex: 0 -> A, 1 -> B)
const getColumnLetter = (colIndex) => {
  let letter = '';
  let tempIndex = colIndex;
  while (tempIndex >= 0) {
    letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
    tempIndex = Math.floor(tempIndex / 26) - 1;
  }
  return letter;
};

// Realiza o parse do CSV mantendo o cabeçalho original para pré-visualização
const parseCSVPreview = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0 || !csvText) return { cols: [], rows: [], rawHeaders: [] };

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  const cols = headers.map((headerName, index) => {
    const colLetter = getColumnLetter(index);
    return { 
      field: headerName, 
      colId: colLetter, 
      headerName: `${colLetter} | ${headerName}`, 
      flex: 1, 
      minWidth: 150 
    };
  });
  
  const rawHeaders = headers.map((headerName, index) => ({ 
    letter: getColumnLetter(index), 
    name: headerName 
  }));

  const rows = lines.slice(1).map(line => {
    const rowValues = line.split(delimiter);
    const rowObject = {};
    headers.forEach((headerName, index) => {
      rowObject[headerName] = rowValues[index] ? rowValues[index].trim() : '';
    });
    return rowObject;
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
  const [baseColumnDefs, setBaseColumnDefs] = useState([]);
  
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

  // Recalcula as definições de coluna injetando a classe CSS dinamicamente no cabeçalho
  const dynamicColumnDefs = useMemo(() => {
    if (viewState !== 'preview') return baseColumnDefs;

    return baseColumnDefs.map(colDef => {
      const colLetter = colDef.colId;
      
      const isIgnored = activeOptions.useIgnore && formValues.ignore.includes(colLetter);
      const isTarget = (activeOptions.useExtras && formValues.extras.includes(colLetter)) || 
                       (activeOptions.useConcat && formValues.concat.includes(colLetter)) || 
                       (activeOptions.useManualPhone && formValues.manualPhone === colLetter);

      let headerCssClass = '';
      if (isIgnored) headerCssClass = 'ag-header-cell-ignored';
      else if (isTarget) headerCssClass = 'ag-header-cell-target';

      return {
        ...colDef,
        headerClass: headerCssClass
      };
    });
  }, [baseColumnDefs, formValues, activeOptions, viewState]);

  const handleOptionToggle = (optionKey) => {
    setActiveOptions(prevOptions => ({ ...prevOptions, [optionKey]: !prevOptions[optionKey] }));
  };

  const handleMultiColumnSelect = (fieldKey, colLetter) => {
    setFormValues(prevValues => {
      const currentSelection = prevValues[fieldKey];
      if (currentSelection.includes(colLetter)) {
        return { ...prevValues, [fieldKey]: currentSelection.filter(letter => letter !== colLetter) };
      } else {
        return { ...prevValues, [fieldKey]: [...currentSelection, colLetter] };
      }
    });
  };

  const handleSingleColumnSelect = (fieldKey, colLetter) => {
    setFormValues(prevValues => ({ ...prevValues, [fieldKey]: colLetter }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
      setViewState('preview');
      setRawCsv(null);
      setFormValues({ extras: [], concat: [], ignore: [], manualPhone: '' });
      setActiveOptions({ useExtras: false, useConcat: false, useIgnore: false, useManualPhone: false });

      const fileReader = new FileReader();
      fileReader.onload = (loadEvent) => {
        try {
          if (file.name.toLowerCase().endsWith('.csv')) {
             const fileText = new TextDecoder("utf-8").decode(loadEvent.target.result);
             const { cols, rows, rawHeaders } = parseCSVPreview(fileText);
             setBaseColumnDefs(cols);
             setRowData(rows);
             setFileHeaders(rawHeaders);
             return;
          }

          const fileData = new Uint8Array(loadEvent.target.result);
          const workbook = read(fileData, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = utils.sheet_to_json(worksheet, { defval: '' });

          if (jsonData.length > 0) {
            const jsonHeaders = Object.keys(jsonData[0]);
            const cols = jsonHeaders.map((headerName, index) => {
              const colLetter = getColumnLetter(index);
              return { 
                field: headerName, 
                colId: colLetter, 
                headerName: `${colLetter} | ${headerName}`, 
                flex: 1, 
                minWidth: 150 
              };
            });
            
            const rawHeaders = jsonHeaders.map((headerName, index) => ({ 
              letter: getColumnLetter(index), 
              name: headerName 
            }));
            
            setBaseColumnDefs(cols);
            setRowData(jsonData);
            setFileHeaders(rawHeaders);
          } else {
            setBaseColumnDefs([]);
            setRowData([]);
            setFileHeaders([]);
          }
        } catch (readError) {
          setErrorMsg('Falha ao ler o arquivo para pré-visualização.');
        }
      };
      fileReader.readAsArrayBuffer(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const requestFormData = new FormData();
      requestFormData.append('file', selectedFile);
      requestFormData.append('extras', activeOptions.useExtras ? formValues.extras.join(', ') : '');
      requestFormData.append('concat', activeOptions.useConcat ? formValues.concat.join(', ') : '');
      requestFormData.append('ignore', activeOptions.useIgnore ? formValues.ignore.join(', ') : '');
      requestFormData.append('manual_phone', activeOptions.useManualPhone ? formValues.manualPhone : '');

      const apiResponse = await fetch('http://localhost:8000/api/normalize', {
        method: 'POST',
        body: requestFormData,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || 'Falha ao processar base no servidor.');
      }

      const responseData = await apiResponse.json();
      setRawCsv(responseData.csv_content);

      const sortedLegend = responseData.legend.sort((a, b) => a.position - b.position);
      const finalHeaders = sortedLegend.map(col => col.label);
      
      const finalCols = finalHeaders.map(headerName => ({ 
        field: headerName, 
        headerName: headerName, 
        flex: 1, 
        minWidth: 150 
      }));

      const csvLines = responseData.csv_content.trim().split(/\r?\n/);
      const csvDelimiter = csvLines.length > 0 && csvLines[0].includes(';') ? ';' : ',';
      
      const finalRows = csvLines.map(line => {
        if (!line.trim()) return null;
        const rowValues = line.split(csvDelimiter);
        const rowObject = {};
        finalHeaders.forEach((headerName, index) => {
          rowObject[headerName] = rowValues[index] ? rowValues[index].trim() : '';
        });
        return rowObject;
      }).filter(Boolean);

      setBaseColumnDefs(finalCols); 
      setRowData(finalRows);
      setViewState('processed');

    } catch (processError) {
      setErrorMsg(processError.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!rawCsv) return;
    const csvBlob = new Blob([rawCsv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(csvBlob);
    const anchorElement = document.createElement('a');
    anchorElement.href = downloadUrl;
    anchorElement.setAttribute('download', 'base_higienizada.csv');
    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
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
          columnDefs={dynamicColumnDefs} // Injeta o cabeçalho calculado
          defaultColDef={defaultColDef}
          gridRef={gridRef}
          handleDownload={handleDownload}
        />
      </div>
    </div>
  );
};

export default App;
