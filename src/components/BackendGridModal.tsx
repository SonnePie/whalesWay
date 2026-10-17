import React, { useState } from 'react';
import { X, Database, RefreshCw, Upload, Download, CheckCircle2, AlertTriangle, Code, Play } from 'lucide-react';
import { WHALE_GRID_CONFIG, validateWhaleGridPayload, simulateBackendGridUpdate, RAW_WHALE_GRID_DATA } from '../data/whaleGridData';

interface BackendGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridData: [number, number, number][];
  onUpdateGridData: (newData: [number, number, number][]) => void;
  onResetGridData: () => void;
}

export const BackendGridModal: React.FC<BackendGridModalProps> = ({
  isOpen,
  onClose,
  gridData,
  onUpdateGridData,
  onResetGridData,
}) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parseStatus, setParseStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showRawSample, setShowRawSample] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle uploading JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const valid = validateWhaleGridPayload(parsed);
        if (valid) {
          onUpdateGridData(valid);
          setParseStatus({
            success: true,
            message: `Successfully loaded ${valid.length} grid nodes from ${file.name}.`,
          });
        } else {
          setParseStatus({
            success: false,
            message: 'Invalid payload schema. Expected Array<[lon, lat, value]> or Array<{lon, lat, value}>.',
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid JSON file';
        setParseStatus({ success: false, message: `JSON parsing error: ${msg}` });
      }
    };
    reader.readAsText(file);
  };

  // Handle manual paste of JSON
  const handleApplyPastedJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const valid = validateWhaleGridPayload(parsed);
      if (valid) {
        onUpdateGridData(valid);
        setParseStatus({
          success: true,
          message: `Applied ${valid.length} spatial grid points from custom JSON!`,
        });
      } else {
        setParseStatus({
          success: false,
          message: 'Expected array of tuples [lon, lat, value] or objects {lon, lat, value}.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format';
      setParseStatus({ success: false, message: `JSON error: ${msg}` });
    }
  };

  // Export current grid data as JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gridData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `whale_grid_backend_dummy_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Simulate dynamic backend update
  const handleSimulateUpdate = () => {
    const simulated = simulateBackendGridUpdate(gridData);
    onUpdateGridData(simulated);
    setParseStatus({
      success: true,
      message: 'Simulated real-time backend ping: 441 nodes updated with realistic drift.',
    });
  };

  // Find peak node
  let maxNode = gridData[0];
  let minNode = gridData[0];
  for (const item of gridData) {
    if (item[2] > maxNode[2]) maxNode = item;
    if (item[2] < minNode[2]) minNode = item;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#040d1a] border border-cyan-800/60 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-slate-200 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-700/50">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Whale Grid Backend Integration (Dummy Data)
              </h2>
              <p className="text-xs text-cyan-300/80">
                Spatial cetacean density model grid received from backend API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Grid Statistics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-sky-950">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-slate-400">Total Mesh Nodes</span>
            <span className="text-lg font-bold font-mono text-cyan-300">{gridData.length} cells</span>
            <span className="text-[10px] text-slate-500">21 x 21 regular grid</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-slate-400">Spatial Extent</span>
            <span className="text-xs font-bold font-mono text-white">62.0°N – 67.0°N</span>
            <span className="text-[10px] font-mono text-slate-500">-22.0°W – -17.0°W (0.25°)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-slate-400">Peak Whale Density</span>
            <span className="text-lg font-bold font-mono text-rose-400">{maxNode[2].toFixed(2)}</span>
            <span className="text-[10px] font-mono text-slate-500">at {maxNode[1]}°N, {maxNode[0]}°W</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-slate-400">Baseline Density</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{minNode[2].toFixed(2)}</span>
            <span className="text-[10px] font-mono text-slate-500">at {minNode[1]}°N, {minNode[0]}°W</span>
          </div>
        </div>

        {/* Status notification */}
        {parseStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              parseStatus.success
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            }`}
          >
            {parseStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{parseStatus.message}</span>
          </div>
        )}

        {/* Explanation for backend developer */}
        <div className="bg-sky-950/40 rounded-xl p-4 border border-sky-800/40 text-xs text-slate-300 flex flex-col gap-2">
          <p className="font-semibold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <span>Backend Schema Specification:</span>
          </p>
          <p>
            The WhaleWay ship navigation engine expects an array of 3-element tuples representing <code className="text-cyan-300 font-mono">[longitude, latitude, whale_density_value]</code>.
          </p>
          <pre className="bg-[#020813] p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-200 overflow-x-auto">
{`// Example API response format: GET /api/v1/whale-risk-grid
[
  [-22.00, 62.00, 19.23],
  [-21.75, 62.00, 19.13],
  ...
  [-17.00, 67.00, 25.55]
]`}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={handleSimulateUpdate}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/30 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Live Backend Ping</span>
          </button>

          <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-slate-700">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Custom JSON File</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Current JSON</span>
          </button>

          <button
            onClick={() => {
              onResetGridData();
              setParseStatus({ success: true, message: 'Reset to original starter dummy values (441 points).' });
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Dummy Data</span>
          </button>
        </div>

        {/* Manual Paste JSON area (collapsible) */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            onClick={() => setShowRawSample(!showRawSample)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-left cursor-pointer"
          >
            <span>{showRawSample ? 'Hide' : 'Show'} Paste Custom JSON Editor</span>
          </button>

          {showRawSample && (
            <div className="flex flex-col gap-2 mt-1">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste backend JSON array here: [[lon, lat, val], ...]"
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                onClick={handleApplyPastedJson}
                disabled={!jsonInput.trim()}
                className="self-end px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
              >
                Apply Custom Values
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
