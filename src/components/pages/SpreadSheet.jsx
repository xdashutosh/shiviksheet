import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Plus, Trash2, RotateCcw, X, Edit3, Check, FileText, Sparkles, Loader2, Bot, Grid3X3, Stars } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Chatbot } from './Chatbot';

/**
 * JSDoc type definitions to replace TypeScript interfaces
 * @typedef {Object.<string, any>} CellData
 * @typedef {Object.<number, CellData>} SpreadsheetData
 * @typedef {{id: string, name: string, data: SpreadsheetData, columns: string[], rows: number}} Sheet
 * @typedef {{sheets: Sheet[], activeSheetId: string}} WorkbookData
 */

const SpreadSheet = () => {
  /**
   * Convert number to Excel column name (A, B, C... Z, AA, AB... ZZ, AAA...)
   * Examples: 1→A, 26→Z, 27→AA, 52→AZ, 53→BA, 702→ZZ, 703→AAA
   * @param {number} num The number to convert.
   * @returns {string} The Excel column name.
   */
  const numberToColumnName = (num) => {
    let result = '';
    while (num > 0) {
      num--; // Convert to 0-based
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  };

  /** @type {[WorkbookData, React.Dispatch<React.SetStateAction<WorkbookData>>]} */
  const [workbook, setWorkbook] = useState(() => {
    const initialColumns = Array.from({ length: 26 }, (_, i) => numberToColumnName(i + 1));
    return {
      sheets: [{
        id: 'sheet1',
        name: 'Sheet1',
        data: {},
        columns: initialColumns,
        rows: 20
      }],
      activeSheetId: 'sheet1'
    };
  });
  
  const [selectedCell, setSelectedCell] = useState(null);
  const [fileName, setFileName] = useState('spreadsheet');
  const [alert, setAlert] = useState(null);
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [tempSheetName, setTempSheetName] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const getCurrentSheet = useCallback(() => {
    return workbook.sheets.find(sheet => sheet.id === workbook.activeSheetId) || workbook.sheets[0];
  }, [workbook]);

  const updateCurrentSheet = useCallback((updates) => {
    setWorkbook(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet => 
        sheet.id === prev.activeSheetId 
          ? { ...sheet, ...updates }
          : sheet
      )
    }));
  }, []);

  /**
   * Initialize empty data structure for a sheet
   * @param {string[]} columns - Array of column names.
   * @param {number} rows - Number of rows.
   * @returns {SpreadsheetData}
   */
  const initializeSheetData = useCallback((columns, rows) => {
    const newData = {};
    for (let r = 0; r < rows; r++) {
      newData[r] = {};
      columns.forEach(col => {
        newData[r][col] = '';
      });
    }
    return newData;
  }, []);

  const getCellValue = (row, col) => {
    const currentSheet = getCurrentSheet();
    return currentSheet.data[row]?.[col] || '';
  };

  const setCellValue = (row, col, value) => {
    const currentSheet = getCurrentSheet();
    const newData = {
      ...currentSheet.data,
      [row]: {
        ...currentSheet.data[row],
        [col]: value
      }
    };
    updateCurrentSheet({ data: newData });
  };

  const handleCellChange = (row, col, value) => {
    setCellValue(row, col, value);
  };

  const addRow = () => {
    const currentSheet = getCurrentSheet();
    const newRows = currentSheet.rows + 1;
    const newData = {
      ...currentSheet.data,
      [currentSheet.rows]: currentSheet.columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
    };
    updateCurrentSheet({ rows: newRows, data: newData });
  };

  const addColumn = () => {
    const currentSheet = getCurrentSheet();
    const nextColumnIndex = currentSheet.columns.length + 1;
    const nextColumnName = numberToColumnName(nextColumnIndex);
    const newColumns = [...currentSheet.columns, nextColumnName];
    
    const newData = { ...currentSheet.data };
    for (let r = 0; r < currentSheet.rows; r++) {
      if (newData[r]) {
        newData[r][nextColumnName] = '';
      }
    }
    
    updateCurrentSheet({ columns: newColumns, data: newData });
  };

  const removeRow = () => {
    const currentSheet = getCurrentSheet();
    if (currentSheet.rows > 1) {
      const newData = { ...currentSheet.data };
      delete newData[currentSheet.rows - 1];
      updateCurrentSheet({ rows: currentSheet.rows - 1, data: newData });
    }
  };

  const removeColumn = () => {
    const currentSheet = getCurrentSheet();
    if (currentSheet.columns.length > 1) {
      const lastCol = currentSheet.columns[currentSheet.columns.length - 1];
      const newColumns = currentSheet.columns.slice(0, -1);
      
      const newData = { ...currentSheet.data };
      Object.keys(newData).forEach(rowKey => {
        if (newData[parseInt(rowKey)]) {
          delete newData[parseInt(rowKey)][lastCol];
        }
      });
      
      updateCurrentSheet({ columns: newColumns, data: newData });
    }
  };

  const clearData = () => {
    const currentSheet = getCurrentSheet();
    const newData = initializeSheetData(currentSheet.columns, currentSheet.rows);
    updateCurrentSheet({ data: newData });
    setAlert({ type: 'success', message: 'Sheet cleared successfully!' });
    setTimeout(() => setAlert(null), 3000);
  };

  const getCurrentSheetAsJson = () => {
    const currentSheet = getCurrentSheet();
    return {
      id: currentSheet.id,
      name: currentSheet.name,
      data: currentSheet.data,
      columns: currentSheet.columns,
      rows: currentSheet.rows,
      exportedAt: new Date().toISOString(),
      exportedAtLocal: new Date().toLocaleString()
    };
  };

  /**
   * Sends a prompt and the current sheet data to the AI for processing.
   * @param {string} prompt The user's prompt for the AI.
   * @returns {Promise<string>} A promise that resolves with the AI's response text.
   */
  const handleAiProcessing = async (prompt) => {
    setIsAiLoading(true);
    setAlert(null); // Clear previous alerts

    try {
      const sheetJsonData = getCurrentSheetAsJson();
      const payload = {
        context: JSON.stringify(sheetJsonData, null, 2), 
        prompt: prompt + "give response in markdown"
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDaQA_5h-pwCPvSOKBpuGtGtgkit8qUuOc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: JSON.stringify(payload) }] }],
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("Received an empty response from the AI.");
      }

      console.log("Received from AI API:", responseText);
      return responseText; // Return the response text to the caller (the chatbot)

    } catch (error) {
      console.error('AI Processing Error:', error);
      // Re-throw the error so the calling component (Chatbot) can handle it
      throw new Error(error.message || 'An unknown error occurred during AI processing.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const downloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      workbook.sheets.forEach(sheet => {
        const wsData = [];
        wsData.push(sheet.columns);
        
        for (let r = 0; r < sheet.rows; r++) {
          const row = sheet.columns.map(col => sheet.data[r]?.[col] || '');
          wsData.push(row);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      setAlert({ type: 'success', message: 'Excel file downloaded successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to download Excel file.' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const downloadJson = () => {
    try {
      const jsonData = {
        fileName: fileName,
        sheets: workbook.sheets.map(sheet => ({
          id: sheet.id,
          name: sheet.name,
          data: sheet.data,
          columns: sheet.columns,
          rows: sheet.rows
        })),
        activeSheetId: workbook.activeSheetId
      };
      
      const dataStr = JSON.stringify(jsonData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'JSON file downloaded successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to download JSON file.' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const downloadCsv = () => {
    try {
      const currentSheet = getCurrentSheet();
      const csvData = [];
      csvData.push(currentSheet.columns.join(','));
      
      for (let r = 0; r < currentSheet.rows; r++) {
        const row = currentSheet.columns.map(col => {
          const value = currentSheet.data[r]?.[col] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvData.push(row.join(','));
      }
      
      const csvContent = csvData.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: 'CSV file downloaded successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to download CSV file.' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const uploadFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(data);
          
          if (jsonData.sheets && Array.isArray(jsonData.sheets)) {
            const importedSheets = jsonData.sheets.map(sheet => ({
              id: sheet.id || `sheet${Date.now()}`,
              name: sheet.name || 'Imported Sheet',
              data: sheet.data || {},
              columns: sheet.columns || [],
              rows: sheet.rows || 0
            }));
            
            setWorkbook({
              sheets: importedSheets,
              activeSheetId: jsonData.activeSheetId || importedSheets[0]?.id || 'sheet1'
            });
            setFileName(jsonData.fileName || 'spreadsheet');
          }
          
          setAlert({ type: 'success', message: 'JSON file uploaded successfully!' });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const importedSheets = [];
          
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
              const columns = jsonData[0].map((_, i) => numberToColumnName(i + 1));
              const rows = jsonData.length - 1;
              const data = {};
              
              for (let r = 1; r < jsonData.length; r++) {
                data[r - 1] = {};
                jsonData[r].forEach((cellValue, colIndex) => {
                  const colName = numberToColumnName(colIndex + 1);
                  data[r - 1][colName] = cellValue !== undefined ? String(cellValue) : '';
                });
              }
              
              importedSheets.push({
                id: `sheet${index + 1}`,
                name: sheetName,
                data: data,
                columns: columns,
                rows: rows
              });
            }
          });
          
          if (importedSheets.length > 0) {
            setWorkbook({
              sheets: importedSheets,
              activeSheetId: importedSheets[0].id
            });
            setFileName(file.name.replace(/\.(xlsx|xls)$/, ''));
          }
          
          setAlert({ type: 'success', message: 'Excel file uploaded successfully!' });
        }
        
        setTimeout(() => setAlert(null), 3000);
      } catch (error) {
        setAlert({ type: 'error', message: 'Failed to upload file. Please check the format.' });
        setTimeout(() => setAlert(null), 3000);
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addSheet = () => {
    const newSheetNumber = workbook.sheets.length + 1;
    const newSheetId = `sheet${Date.now()}`;
    const initialColumns = Array.from({ length: 26 }, (_, i) => numberToColumnName(i + 1));
    
    const newSheet = {
      id: newSheetId,
      name: `Sheet${newSheetNumber}`,
      data: {},
      columns: initialColumns,
      rows: 20
    };
    
    setWorkbook(prev => ({
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheetId
    }));
    
    setAlert({ type: 'success', message: `Sheet${newSheetNumber} added successfully!` });
    setTimeout(() => setAlert(null), 3000);
  };

  const deleteSheet = (sheetId) => {
    if (workbook.sheets.length === 1) {
      setAlert({ type: 'error', message: 'Cannot delete the last sheet!' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }
    
    const sheetToDelete = workbook.sheets.find(s => s.id === sheetId);
    const newSheets = workbook.sheets.filter(s => s.id !== sheetId);
    const newActiveSheetId = workbook.activeSheetId === sheetId 
      ? newSheets[0].id 
      : workbook.activeSheetId;
    
    setWorkbook({
      sheets: newSheets,
      activeSheetId: newActiveSheetId
    });
    
    setAlert({ type: 'success', message: `${sheetToDelete?.name} deleted successfully!` });
    setTimeout(() => setAlert(null), 3000);
  };

  const switchToSheet = (sheetId) => {
    setWorkbook(prev => ({
      ...prev,
      activeSheetId: sheetId
    }));
  };

  const startEditingSheetName = (sheetId, currentName) => {
    setEditingSheetId(sheetId);
    setTempSheetName(currentName);
  };

  const saveSheetName = () => {
    if (tempSheetName.trim()) {
      setWorkbook(prev => ({
        ...prev,
        sheets: prev.sheets.map(sheet =>
          sheet.id === editingSheetId
            ? { ...sheet, name: tempSheetName.trim() }
            : sheet
        )
      }));
    }
    setEditingSheetId(null);
    setTempSheetName('');
  };

  const cancelEditingSheetName = () => {
    setEditingSheetId(null);
    setTempSheetName('');
  };


  const currentSheet = getCurrentSheet();

  return (
    <div className="max-h-screen overflow-hidden ">
      <Card className="shadow-lg border-gray-200 dark:border-gray-700 max-h-screen overflow-hidden">
        <CardHeader className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-row justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Grid3X3 className="w-7 h-7 text-emerald-600" />
              ShivikSheet
            </CardTitle>


            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="max-w-xs h-9 border-gray-300 dark:border-gray-600 focus:border-emerald-500"
                placeholder="Enter filename"
              />
            </div>

              <div className="flex gap-2">
            <div className="">
              <div className="flex gap-2">
                <Button onClick={downloadExcel} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-3 h-3 mr-1" />Excel
                </Button>
                <Button onClick={downloadJson} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-3 h-3 mr-1" />JSON
                </Button>
                <Button onClick={downloadCsv} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-3 h-3 mr-1" />CSV
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Upload className="w-3 h-3 mr-1" />Import
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.json"
                  onChange={uploadFile}
                  className="hidden"
                />
                <Button 
                  onClick={() => setIsChatOpen(true)} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <Stars className="w-3 h-3 mr-1" />
                  AI Chat
                  {isAiLoading && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
                </Button>
                {isChatOpen && (
                  <Chatbot 
                    onSendMessage={handleAiProcessing}
                    isLoading={isAiLoading}
                    onClose={() => setIsChatOpen(false)}
                  />
                )}
              </div>
               
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={addRow} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-3 h-3 mr-1" />Row
                </Button>
                <Button onClick={addColumn} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-3 h-3 mr-1" />Column
                </Button>
                <Button onClick={removeRow} size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                  <Trash2 className="w-3 h-3 mr-1" />Row
                </Button>
                <Button onClick={removeColumn} size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                  <Trash2 className="w-3 h-3 mr-1" />Column
                </Button>
                <Button onClick={clearData} size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                  <RotateCcw className="w-3 h-3 mr-1" />Clear
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-1 bg-white dark:bg-gray-800">
        
        

          <div className="flex items-center gap-1 border-b border-gray-300 dark:border-gray-600 ">
            <div className="flex gap-1 overflow-x-auto overflow-y-hidden flex-1">
              {workbook.sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`group flex items-center gap-1 px-3 py-2 text-sm border-t border-l border-r cursor-pointer transition-colors ${
                    sheet.id === workbook.activeSheetId
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-medium -mb-px'
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {editingSheetId === sheet.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tempSheetName}
                        onChange={(e) => setTempSheetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSheetName();
                          if (e.key === 'Escape') cancelEditingSheetName();
                        }}
                        onBlur={saveSheetName}
                        className="h-6 w-24 text-xs border-emerald-300 focus:border-emerald-500"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={saveSheetName} className="h-5 w-5 hover:bg-emerald-100">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => switchToSheet(sheet.id)}
                        className="select-none"
                      >
                        {sheet.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditingSheetName(sheet.id, sheet.name)}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      {workbook.sheets.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSheet(sheet.id)}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
                <Button
              onClick={addSheet}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Plus className="w-3 h-3" />
            </Button>
            </div>
          </div>

          <div className="border border-gray-300 dark:border-gray-600 mt-4 overflow-hidden bg-white dark:bg-gray-900">
            <div className="overflow-auto max-h-[450px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-12 h-8 border-r border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300"></th>
                    {currentSheet.columns.map((col) => (
                      <th
                        key={col}
                        className="min-w-24 h-8 border-r border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 px-2"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: currentSheet.rows }, (_, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="w-12 px-2 h-7 border-r border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-center text-gray-700 dark:text-gray-300">
                        {rowIndex + 1}
                      </td>
                      {currentSheet.columns.map((col) => {
                        const cellKey = `${rowIndex}-${col}`;
                        return (
                          <td key={cellKey} className="border-r border-b border-gray-200 dark:border-gray-700 p-0">
                            <input
                              type="text"
                              value={getCellValue(rowIndex, col)}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                              onFocus={() => setSelectedCell(cellKey)}
                              onBlur={() => setSelectedCell(null)}
                              className={`w-full h-7 px-2 text-sm border-none outline-none bg-transparent ${
                                selectedCell === cellKey 
                                  ? 'ring-2 ring-emerald-500 bg-white dark:bg-gray-800' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

       
        </CardContent>
      </Card>
    </div>
  );
};

export default SpreadSheet;