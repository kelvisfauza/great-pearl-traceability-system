import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Leaf, Globe, FileCheck } from 'lucide-react';

const TraceabilitySlide = () => {
  const [stats, setStats] = useState({
    tracedBatches: 0,
    eudrCompliant: 0,
    totalDocs: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: batches } = await supabase.from('eudr_batches').select('id, status');
      const { data: docs } = await supabase.from('eudr_documents').select('id');

      setStats({
        tracedBatches: batches?.length || 0,
        eudrCompliant: batches?.filter(b => b.status === 'traced').length || 0,
        totalDocs: docs?.length || 0
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="h-12 w-12 text-green-400" />
        <h2 className="text-5xl font-bold text-white">Full Traceability</h2>
      </div>

      <p className="text-white/70 text-2xl text-center max-w-3xl mb-12">
        Every bean traced from farm to export. EUDR compliant. 
        Sustainable sourcing for a greener future.
      </p>

      <div className="grid grid-cols-3 gap-8 max-w-4xl">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto mb-4">
            <Leaf className="h-12 w-12 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-green-200">{stats.tracedBatches}</p>
          <p className="text-green-300/80">Traced Batches</p>
        </div>

        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-12 w-12 text-blue-400" />
          </div>
          <p className="text-4xl font-bold text-blue-200">100%</p>
          <p className="text-blue-300/80">EU Export Ready</p>
        </div>

        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-12 w-12 text-purple-400" />
          </div>
          <p className="text-4xl font-bold text-purple-200">{stats.totalDocs}</p>
          <p className="text-purple-300/80">EUDR Documents</p>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-8 text-white/60">
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          GPS Verified Farms
        </span>
        <span>•</span>
        <span>Deforestation-Free Coffee</span>
        <span>•</span>
        <span>Complete Chain of Custody</span>
      </div>
    </div>
  );
};

export default TraceabilitySlide;
