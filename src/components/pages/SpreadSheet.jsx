import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Plus, Trash2, RotateCcw, X, Edit3, Check, FileText, Sparkles, Loader2, Bot, Grid3X3, Palette } from 'lucide-react';
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
    const initialColumns = Array.from({ length: 5 }, (_, i) => numberToColumnName(i + 1));
    return {
      sheets: [{
        id: 'sheet1',
        name: 'Sheet1',
        data: {},
        columns: initialColumns,
        rows: 10
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
    setAlert({ type: 'success', message: '✨ Sheet cleared successfully!' });
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

  const exportDataToJson = () => {
    try {
      const exportData = getCurrentSheetAsJson();
      const jsonContent = JSON.stringify(exportData, null, 2);
      
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'output.json');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setAlert({ type: 'success', message: '🎉 Data exported to output.json successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: '❌ Error exporting data to JSON file!' });
    }
    setTimeout(() => setAlert(null), 3000);
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAQ9Tir9iFm0YJESYMrOGJpcDklwn8WUBM`, {
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

  const addSheet = () => {
    const newSheetNumber = workbook.sheets.length + 1;
    const initialColumns = Array.from({ length: 5 }, (_, i) => numberToColumnName(i + 1));
    const newSheet = {
      id: `sheet${Date.now()}`,
      name: `Sheet${newSheetNumber}`,
      data: initializeSheetData(initialColumns, 10),
      columns: initialColumns,
      rows: 10
    };
    
    setWorkbook(prev => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id
    }));
  };

  const deleteSheet = (sheetId) => {
    if (workbook.sheets.length === 1) {
      setAlert({ type: 'error', message: '❌ Cannot delete the last sheet!' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    const newSheets = workbook.sheets.filter(sheet => sheet.id !== sheetId);
    const newActiveSheetId = workbook.activeSheetId === sheetId 
      ? newSheets[0].id 
      : workbook.activeSheetId;

    setWorkbook(prev => ({
      ...prev,
      sheets: newSheets,
      activeSheetId: newActiveSheetId
    }));
  };

  const switchToSheet = (sheetId) => {
    setWorkbook(prev => ({
      ...prev,
      activeSheetId: sheetId
    }));
    setSelectedCell(null);
  };

  const startEditingSheetName = (sheetId, currentName) => {
    setEditingSheetId(sheetId);
    setTempSheetName(currentName);
  };

  const saveSheetName = () => {
    if (editingSheetId && tempSheetName.trim()) {
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

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      workbook.sheets.forEach(sheet => {
        const wsData = [];
        wsData.push(sheet.columns);
        
        for (let r = 0; r < sheet.rows; r++) {
          const row = [];
          sheet.columns.forEach(col => {
            row.push(sheet.data[r]?.[col] || '');
          });
          wsData.push(row);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      
      setAlert({ type: 'success', message: '🎉 Excel file exported successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: '❌ Error exporting Excel file!' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const importFromExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const newSheets = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
          const ws = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (jsonData.length > 0) {
            const maxCols = Math.max(...jsonData.map(row => row.length));
            const importedColumns = Array.from({ length: Math.max(maxCols, 1) }, (_, i) => 
              numberToColumnName(i + 1)
            );
            
            const importedRows = Math.max(jsonData.length, 1);
            
            const sheetData = {};
            for (let r = 0; r < importedRows; r++) {
              sheetData[r] = {};
              importedColumns.forEach((col, colIndex) => {
                const rowData = jsonData[r] || [];
                sheetData[r][col] = rowData[colIndex] || '';
              });
            }
            
            newSheets.push({
              id: `sheet${Date.now()}_${index}`,
              name: sheetName,
              data: sheetData,
              columns: importedColumns,
              rows: importedRows
            });
          }
        });
        
        if (newSheets.length > 0) {
          setWorkbook({
            sheets: newSheets,
            activeSheetId: newSheets[0].id
          });
          setFileName(file.name.replace(/\.[^/.]+$/, ""));
          setAlert({ type: 'success', message: `🎉 Excel file imported successfully with ${newSheets.length} sheet(s)!` });
        } else {
          setAlert({ type: 'error', message: '❌ No data found in Excel file!' });
        }
      } catch (error) {
        setAlert({ type: 'error', message: '❌ Error reading Excel file!' });
      }
      setTimeout(() => setAlert(null), 3000);
    };
    
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentSheet = getCurrentSheet();

  return (
    <div className="w-full  mx-auto min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Header with gradient background */}
      <div className="my-4">
        <div className="text-center ">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            ✨ SHIVIK AI Spreadsheet
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Create, edit, and analyze your data with AI assistance
          </p>
        </div>
      </div>

      <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardContent className="space-y-6 pt-8">
          {alert && (
            <Alert className={`${
              alert.type === 'error' 
                ? 'border-red-300 bg-gradient-to-r from-red-50 to-pink-50 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-200' 
                : 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200'
            } shadow-lg border-2`}>
              <AlertDescription className="font-medium">{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced toolbar with gradients */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-inner">
            <div className="flex flex-wrap gap-3 items-center">
              {/* File operations section */}
              <div className="flex flex-wrap gap-2 items-center  bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <Input
                    placeholder="File name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-48 border-blue-200 focus:border-blue-400 dark:border-blue-700"
                  />
                </div>
                
                <Button 
                  onClick={exportToExcel} 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>

                <Button 
                  onClick={exportDataToJson} 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>

              {/* AI section */}
              <div className="flex gap-2 items-center p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl shadow-sm border border-purple-200 dark:border-purple-700">
                <Button 
                  onClick={() => setIsChatOpen(true)} 
                  className="bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 hover:from-purple-600 hover:via-violet-600 hover:to-pink-600 text-white shadow-lg"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI Chat
                  {isAiLoading && <Loader2 className="w-4 h-4  animate-spin" />}
                </Button>
                {isChatOpen && (
                  <Chatbot 
                    onSendMessage={handleAiProcessing}
                    isLoading={isAiLoading}
                    onClose={() => setIsChatOpen(false)}
                  />
                )}
              </div>

              {/* Import section */}
              <div className="flex gap-2 items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={importFromExcel}
                  className="hidden"
                />
              </div>
              
              {/* Edit operations */}
              <div className="flex gap-2 items-center p-3 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center gap-1">
                  <Grid3X3 className="w-4 h-4 text-indigo-600 mr-1" />
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mr-2">Edit:</span>
                </div>
                <Button onClick={addRow} size="sm" className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white">
                  <Plus className="w-3 h-3 mr-1" />Row
                </Button>
                <Button onClick={addColumn} size="sm" className="bg-gradient-to-r from-blue-400 to-sky-500 hover:from-blue-500 hover:to-sky-600 text-white">
                  <Plus className="w-3 h-3 mr-1" />Column
                </Button>
                <Button onClick={removeRow} size="sm" className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white">
                  <Trash2 className="w-3 h-3 mr-1" />Row
                </Button>
                <Button onClick={removeColumn} size="sm" className="bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white">
                  <Trash2 className="w-3 h-3 mr-1" />Column
                </Button>
                <Button onClick={clearData} size="sm" className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white">
                  <RotateCcw className="w-3 h-3 mr-1" />Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced sheet tabs */}
          <div className="flex items-center gap-1 border-b-2 border-gray-200 dark:border-gray-700">
            <div className="flex gap-1 overflow-x-auto flex-1">
              {workbook.sheets.map((sheet, index) => (
                <div
                  key={sheet.id}
                  className={`group flex items-center gap-1 px-4 py-3 text-sm border-t-2 border-l border-r rounded-t-lg cursor-pointer transition-all duration-200 ${
                    sheet.id === workbook.activeSheetId
                      ? 'bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-blue-500 border-b-white dark:border-b-gray-800 -mb-0.5 shadow-lg text-blue-700 dark:text-blue-300'
                      : 'bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50 hover:border-blue-300'
                  }`}
                  style={{
                    background: sheet.id === workbook.activeSheetId 
                      ? `linear-gradient(135deg, ${index % 2 === 0 ? '#dbeafe, #bfdbfe' : '#fce7f3, #fbcfe8'})` 
                      : undefined
                  }}
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
                        className="h-6 w-24 text-xs border-blue-300 focus:border-blue-500"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={saveSheetName} className="h-5 w-5 hover:bg-green-100">
                        <Check className="w-3 h-3 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => switchToSheet(sheet.id)}
                        className="select-none font-medium flex items-center gap-1"
                      >
                        <Palette className="w-3 h-3 opacity-60" />
                        {sheet.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditingSheetName(sheet.id, sheet.name)}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100"
                      >
                        <Edit3 className="w-3 h-3 text-blue-600" />
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
            </div>
            <Button
              onClick={addSheet}
              size="sm"
              className="flex items-center gap-1 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg"
            >
              <Plus className="w-3 h-3" />
              Add Sheet
            </Button>
          </div>

          {/* Enhanced spreadsheet table */}
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-gray-900">
            <div className="overflow-auto max-h-96">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-12 h-10 border border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300"></th>
                    {currentSheet.columns.map((col, index) => (
                      <th
                        key={col}
                        className="min-w-24 h-10 border border-gray-300 dark:border-gray-600 text-xs font-bold px-3 text-gray-700 dark:text-gray-300"
                        style={{
                          background: `linear-gradient(135deg, ${
                            index % 4 === 0 ? '#dbeafe, #bfdbfe' :
                            index % 4 === 1 ? '#fce7f3, #fbcfe8' :
                            index % 4 === 2 ? '#d1fae5, #a7f3d0' :
                            '#fef3c7, #fde68a'
                          })`
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: currentSheet.rows }, (_, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                      <td className="w-12 px-2 h-10 border border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-xs font-bold text-center text-gray-700 dark:text-gray-300">
                        {rowIndex + 1}
                      </td>
                      {currentSheet.columns.map((col, colIndex) => {
                        const cellKey = `${rowIndex}-${col}`;
                        return (
                          <td key={cellKey} className="border border-gray-300 dark:border-gray-600 p-0">
                            <input
                              type="text"
                              value={getCellValue(rowIndex, col)}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                              onFocus={() => setSelectedCell(cellKey)}
                              onBlur={() => setSelectedCell(null)}
                              className={`w-full h-10 px-3 text-sm border-none outline-none bg-transparent transition-all duration-200 ${
                                selectedCell === cellKey 
                                  ? 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50 shadow-inner' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
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

          {/* Enhanced footer with gradient background */}
          <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-800 dark:via-blue-900/30 dark:to-indigo-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
                  <span><strong className="text-blue-700 dark:text-blue-300">Active Sheet:</strong> {currentSheet.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
                  <span><strong className="text-green-700 dark:text-green-300">Size:</strong> {currentSheet.rows} rows × {currentSheet.columns.length} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-rose-500"></div>
                  <span><strong className="text-pink-700 dark:text-pink-300">Total Sheets:</strong> {workbook.sheets.length}</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 italic">
                ✨ Click on any cell to edit • Use the colorful tabs to manage sheets • Export your data in multiple formats • Chat with AI for insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpreadSheet;