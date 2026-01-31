import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading map...</p>
            </div>
        </div>
    ),
});

export { LeafletMap };
