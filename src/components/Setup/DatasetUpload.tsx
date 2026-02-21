import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { parseCSV, type ParseResult } from '../../utils/csv';
import { clsx } from 'clsx';

interface DatasetUploadProps {
    onUpload: (data: Record<string, any>[], columns: string[]) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({ onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ParseResult | null>(null);

    const handleFile = async (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Please upload a CSV file.');
            return;
        }

        try {
            const results = await parseCSV(file);
            if (results.errors.length > 0) {
                setError(`Error parsing CSV: ${results.errors[0].message}`);
                return;
            }
            if (results.data.length === 0) {
                setError('The CSV file is empty.');
                return;
            }
            setPreview(results);
            setError(null);
        } catch (err) {
            setError('Failed to read CSV file.');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const confirmUpload = () => {
        if (preview) {
            onUpload(preview.data, preview.meta.fields || []);
        }
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={clsx(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
                    isDragging ? "border-blue-500 bg-blue-50/10" : "border-white/10 hover:border-white/20",
                    preview ? "bg-green-50/5 border-green-500/50" : "bg-white/5"
                )}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFile(file);
                    };
                    input.click();
                }}
            >
                {preview ? (
                    <>
                        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                        <p className="text-lg font-medium">CSV Parsed Successfully</p>
                        <p className="text-sm text-gray-400">{preview.data.length} rows detected</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">Drag and drop your CSV or click to browse</p>
                        <p className="text-sm text-gray-400">Supported format: .csv</p>
                    </>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {preview && (
                <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-medium">Data Preview</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/5 text-gray-400">
                                    <tr>
                                        {preview.meta.fields?.slice(0, 5).map((field: string) => (
                                            <th key={field} className="p-3 font-medium">{field}</th>
                                        ))}
                                        {preview.meta.fields && preview.meta.fields.length > 5 && (
                                            <th className="p-3">...</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {preview.data.slice(0, 3).map((row: any, i: number) => (
                                        <tr key={i}>
                                            {preview.meta.fields?.slice(0, 5).map((field: string) => (
                                                <td key={field} className="p-3 truncate max-w-[200px]">{row[field]}</td>
                                            ))}
                                            {preview.meta.fields && preview.meta.fields.length > 5 && (
                                                <td className="p-3 text-gray-500">...</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <button
                        onClick={confirmUpload}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Import {preview.data.length} Rows
                    </button>
                </div>
            )}
        </div>
    );
};
