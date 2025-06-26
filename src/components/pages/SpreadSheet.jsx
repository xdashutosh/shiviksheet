import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Plus, Trash2, RotateCcw, X, Edit3, Check, FileSpreadsheet, FileText, Sparkles, Loader2, Bot } from 'lucide-react';
import * as XLSX from 'xlsx';

// Simple Chatbot component for demo purposes
const Chatbot = ({ onSendMessage, isLoading, onClose }) => {
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setMessage('');
    setResponses(prev => [...prev, { type: 'user', content: userMessage }]);
    
    try {
      const response = await onSendMessage(userMessage);
      setResponses(prev => [...prev, { type: 'ai', content: response }]);
    } catch (error) {
      setResponses(prev => [...prev, { type: 'error', content: 'Error processing request' }]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col mx-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {responses.map((response, index) => (
            <div key={index} className={`flex ${response.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                response.type === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                  : response.type === 'error'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{response.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your spreadsheet data..."
              className="flex-1 border-slate-300 dark:border-slate-600 focus:border-violet-500 focus:ring-violet-500"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || isLoading}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SpreadSheet = () => {
  // Convert number to Excel column name (A, B, C... Z, AA, AB... ZZ, AAA...)
  // Examples: 1→A, 26→Z, 27→AA, 52→AZ, 53→BA, 702→ZZ, 703→AAA
  const numberToColumnName = (num) => {
    let result = '';
    while (num > 0) {
      num--; // Convert to 0-based
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  };

  const [workbook, setWorkbook] = useState(() => {
    const initialColumns = Array.from({ length: 8 }, (_, i) => numberToColumnName(i + 1));
    return {
      sheets: [{
        id: 'sheet1',
        name: 'Sheet1',
        data: {},
        columns: initialColumns,
        rows: 15
      }],
      activeSheetId: 'sheet1'
    };
  });
  
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
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
      
      setAlert({ type: 'success', message: 'Data exported to output.json successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Error exporting data to JSON file!' });
    }
    setTimeout(() => setAlert(null), 3000);
  };
  
  const handleAiProcessing = async (prompt) => {
    setIsAiLoading(true);
    setAlert(null);

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
      return responseText;
    } catch (error) {
      console.error('AI Processing Error:', error);
      throw new Error(error.message || 'An unknown error occurred during AI processing.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const addSheet = () => {
    const newSheetNumber = workbook.sheets.length + 1;
    const initialColumns = Array.from({ length: 8 }, (_, i) => numberToColumnName(i + 1));
    const newSheet = {
      id: `sheet${Date.now()}`,
      name: `Sheet${newSheetNumber}`,
      data: initializeSheetData(initialColumns, 15),
      columns: initialColumns,
      rows: 15
    };
    
    setWorkbook(prev => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id
    }));
  };

  const deleteSheet = (sheetId) => {
    if (workbook.sheets.length === 1) {
      setAlert({ type: 'error', message: 'Cannot delete the last sheet!' });
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
      
      setAlert({ type: 'success', message: 'Excel file exported successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Error exporting Excel file!' });
    }
    setTimeout(() => setAlert(null), 3000);
  };

  const importFromExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const wb = XLSX.read(data, { type: 'array' });
        
        const newSheets = [];
        
        wb.SheetNames.forEach((sheetName, index) => {
          const ws = wb.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (jsonData.length > 0) {
            const maxCols = Math.max(...jsonData.map(row => row.length), 1);
            const importedColumns = Array.from({ length: maxCols }, (_, i) => numberToColumnName(i + 1));
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
          setAlert({ type: 'success', message: `Excel file imported successfully with ${newSheets.length} sheet(s)!` });
        } else {
          setAlert({ type: 'error', message: 'No data found in Excel file!' });
        }
      } catch (error) {
        setAlert({ type: 'error', message: 'Error reading Excel file!' });
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
    <div className="w-full  px-4 mx-auto my-8">
      <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white drop-shadow-sm">Sheet Genius SHIVIK</CardTitle>
          </div>
          <Button 
            onClick={() => setIsChatOpen(true)} 
            className="flex items-center gap-2 text-xl font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3"
          >
            <Sparkles className="w-5 h-5" />
            Ask AI
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          {alert && (
            <Alert className={`rounded-xl border-0 shadow-lg ${
              alert.type === 'error' 
                ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-300' 
                : 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300'
            }`}>
              <AlertDescription className="font-medium">{alert.message}</AlertDescription>
            </Alert>
          )}

          {isChatOpen && (
            <Chatbot 
              onSendMessage={handleAiProcessing}
              isLoading={isAiLoading}
              onClose={() => setIsChatOpen(false)}
            />
          )}

          <div className="flex flex-wrap gap-3 items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <Input
              placeholder="File name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-48 h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 rounded-xl bg-slate-50 dark:bg-slate-700"
            />
            <Button 
              onClick={exportToExcel} 
              className="flex items-center gap-2 h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
            >
              <Download className="w-4 h-4" />Export (.xlsx)
            </Button>
            <Button 
              onClick={exportDataToJson} 
              className="flex items-center gap-2 h-10 border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 rounded-xl" 
              variant="outline"
            >
              <FileText className="w-4 h-4" />Export (.json)
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              className="flex items-center gap-2 h-10 border-2 border-slate-300 dark:border-slate-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 rounded-xl"
            >
              <Upload className="w-4 h-4" />Import (.xlsx)
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={importFromExcel} className="hidden" />

            <div className="border-l-2 border-slate-300 dark:border-slate-700 pl-3 ml-3 flex gap-2">
              <Button 
                onClick={addRow} 
                size="sm" 
                variant="outline" 
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" />Row
              </Button>
              <Button 
                onClick={addColumn} 
                size="sm" 
                variant="outline" 
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" />Column
              </Button>
              <Button 
                onClick={removeRow} 
                size="sm" 
                variant="outline" 
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4 mr-1" />Row
              </Button>
              <Button 
                onClick={removeColumn} 
                size="sm" 
                variant="outline" 
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4 mr-1" />Column
              </Button>
              <Button 
                onClick={clearData} 
                size="sm" 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
              >
                <RotateCcw className="w-4 h-4 mr-1" />Clear Sheet
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <div className="flex-1 flex items-end gap-1 overflow-x-auto p-2">
                {workbook.sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl cursor-pointer transition-all duration-200 ${
                      sheet.id === workbook.activeSheetId
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-lg border-t-2 border-l-2 border-r-2 border-blue-500 -mb-px'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    {editingSheetId === sheet.id ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          value={tempSheetName} 
                          onChange={(e) => setTempSheetName(e.target.value)} 
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter') saveSheetName(); 
                            if (e.key === 'Escape') cancelEditingSheetName(); 
                          }} 
                          onBlur={saveSheetName} 
                          className="h-7 w-28 text-xs border-blue-300 focus:border-blue-500 rounded-lg" 
                          autoFocus 
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={saveSheetName} 
                          className="h-6 w-6 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span onClick={() => switchToSheet(sheet.id)} className="select-none font-medium">
                          {sheet.name}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => startEditingSheetName(sheet.id, sheet.name)} 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </Button>
                        {workbook.sheets.length > 1 && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => deleteSheet(sheet.id)} 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <X className="w-3 h-3 text-red-600 dark:text-red-400" />
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
                variant="ghost" 
                className="flex items-center gap-2 text-xs h-10 px-4 mx-3 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />New Sheet
              </Button>
            </div>

            <div className="border-0 rounded-b-2xl overflow-auto max-h-[60vh] relative bg-white dark:bg-slate-800">
              <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-20 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 backdrop-blur-sm">
                  <tr>
                    <th className="w-16 h-10 border-b-2 border-r-2 border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-xs font-bold sticky left-0 z-10 text-slate-600 dark:text-slate-300"></th>
                    {currentSheet.columns.map((col) => (
                      <th 
                        key={col} 
                        className={`min-w-24 h-10 px-3 border-b-2 border-r border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all duration-200 ${
                          (hoveredCell?.col === col) && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody onMouseLeave={() => setHoveredCell(null)}>
                  {Array.from({ length: currentSheet.rows }, (_, rowIndex) => (
                    <tr key={rowIndex} className="transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className={`w-16 px-2 h-10 border-r-2 border-b border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 text-center sticky left-0 z-10 transition-all duration-200 ${
                        (hoveredCell?.row === rowIndex) && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {rowIndex + 1}
                      </td>
                      {currentSheet.columns.map((col) => {
                        const cellKey = `${rowIndex}-${col}`;
                        const isSelected = selectedCell === cellKey;
                        const isHovered = hoveredCell?.row === rowIndex || hoveredCell?.col === col;
                        return (
                          <td 
                            key={cellKey} 
                            onMouseEnter={() => setHoveredCell({ row: rowIndex, col: col })} 
                            className={`border-b border-r border-slate-200 dark:border-slate-600 p-0 relative transition-all duration-200 ${
                              isSelected 
                                ? 'ring-2 ring-blue-500 ring-inset z-10 bg-blue-50 dark:bg-blue-900/20' 
                                : ''
                            } ${
                              !isSelected && isHovered 
                                ? 'bg-slate-100 dark:bg-slate-700/50' 
                                : ''
                            }`}
                          >
                            <input
                              type="text"
                              value={getCellValue(rowIndex, col)}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                              onFocus={() => setSelectedCell(cellKey)}
                              className="w-full h-full px-3 py-2 text-sm bg-transparent outline-none focus:ring-0 focus:bg-white dark:focus:bg-slate-800 transition-colors duration-200"
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

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Active Sheet:</span> {currentSheet.name}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Size:</span> {currentSheet.rows} rows × {currentSheet.columns.length} columns
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-purple-600 dark:text-purple-400">Total Sheets:</span> {workbook.sheets.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpreadSheet;