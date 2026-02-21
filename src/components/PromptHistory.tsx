import React, { useEffect, useState } from 'react';
import { PromptVersion } from '../types';
import { supabase } from '../supabaseClient';
import { Icons } from './Icon';

interface PromptHistoryProps {
    promptId: string;
    onRestore: (content: string) => void;
}

export const PromptHistory: React.FC<PromptHistoryProps> = ({ promptId, onRestore }) => {
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('prompt_versions')
                .select('*')
                .eq('prompt_id', promptId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching history:', error);
            } else {
                setVersions(data || []);
            }
            setLoading(false);
        };

        if (promptId) {
            fetchHistory();
        }
    }, [promptId]);

    if (loading) return <div className="p-4 text-center text-arch-500">Cargando historial...</div>;
    if (versions.length === 0) return <div className="p-4 text-center text-arch-500">No hay historial de cambios.</div>;

    return (
        <div className="space-y-3 p-2">
            {versions.map((version) => (
                <div key={version.id} className="bg-arch-950 p-3 rounded-md border border-arch-800 flex justify-between items-start group">
                    <div>
                        <div className="text-xs text-arch-400 mb-1">
                            {new Date(version.createdAt).toLocaleString()}
                        </div>
                        {version.changeSummary && (
                            <div className="text-xs text-arch-300 italic mb-2">
                                {version.changeSummary}
                            </div>
                        )}
                        <div className="text-[10px] text-arch-500 line-clamp-2 font-mono bg-arch-900 p-1 rounded">
                            {version.content}
                        </div>
                    </div>
                    <button
                        onClick={() => onRestore(version.content)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-arch-800 text-accent-400 rounded hover:bg-accent-600 hover:text-white transition-all ml-2"
                        title="Restaurar esta versión"
                    >
                        <Icons.Refresh size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
