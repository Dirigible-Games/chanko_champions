import { motion } from 'motion/react';
import { Rikishi, AttributeKey } from '../types';
import { AttributeIcon } from './AttributeIcon';
import { ShieldAlert, HeartPulse, Activity, ExternalLink, Calendar, Database } from 'lucide-react';

interface HealthViewProps {
  rikishi: Rikishi;
  onBack: () => void;
}

export default function HealthView({ rikishi, onBack }: HealthViewProps) {
  const attrs: AttributeKey[] = ['power', 'balance', 'footwork', 'technique', 'spirit'];
  const attrMapping: Record<AttributeKey, string> = {
    power: 'Power',
    balance: 'Balance',
    footwork: 'Footwork',
    technique: 'Technique',
    spirit: 'Spirit'
  };

  const hasInjuries = Object.values(rikishi.injuries).some(i => i.severity > 0);
  const hasPenalties = Object.values(rikishi.permanentPenalties).some(p => p > 0);

  return (
    <div className="h-full bg-sumo-paper flex flex-col p-6 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-xl border border-red-200">
            <HeartPulse className="text-red-800" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-black tracking-tight text-sumo-ink uppercase">Health Status</h2>
            <p className="text-[10px] uppercase font-bold text-sumo-ink/40 tracking-widest leading-none mt-0.5">Physical Medical Records</p>
          </div>
        </div>
        <button onClick={onBack} className="p-2 bg-sumo-earth/10 rounded-full hover:bg-sumo-earth/20 transition-colors">
          <AttributeIcon attr="footwork" size={20} className="rotate-180" />
        </button>
      </div>

      <div className="space-y-6 pb-20">
        {/* Global Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-sumo-earth/20 rounded-2xl p-4 shadow-sm">
            <span className="text-[8px] font-black uppercase text-sumo-ink/30 tracking-widest block mb-2">Historical Fatigue</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black">{rikishi.baseFatigue}</span>
              <span className="text-[10px] font-bold text-sumo-ink/40">BASE %</span>
            </div>
          </div>
          <div className="bg-white border border-sumo-earth/20 rounded-2xl p-4 shadow-sm">
            <span className="text-[8px] font-black uppercase text-sumo-ink/30 tracking-widest block mb-2">Lifetime Injuries</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black">{rikishi.totalUniqueInjuries}</span>
              <span className="text-[10px] font-bold text-sumo-ink/40">ACCRUED</span>
            </div>
          </div>
        </div>

        {/* Attribute Health Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-sumo-ink/60 tracking-widest pl-2">Attribute Breakdown</h3>
          
          <div className="space-y-3">
            {attrs.map(attr => {
              const injury = rikishi.injuries[attr];
              const penalty = rikishi.permanentPenalties[attr];
              const isCompromised = injury.severity > 0 || penalty > 0;

              return (
                <div key={attr} className={`rounded-2xl border transition-all ${isCompromised ? 'bg-red-50/50 border-red-200' : 'bg-white border-sumo-earth/10 opacity-70'}`}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg border ${isCompromised ? 'bg-red-100 border-red-200' : 'bg-sumo-paper border-sumo-earth/10'}`}>
                        <AttributeIcon attr={attr} size={20} className={isCompromised ? 'text-red-900' : 'text-sumo-ink'} />
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase tracking-tight text-sumo-ink">{attrMapping[attr]}</div>
                        <div className="text-[8px] font-bold text-sumo-ink/40 uppercase">Current Stat: {rikishi.stats[attr] - penalty}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                       <div className="text-right">
                         <div className="text-[7px] font-black uppercase opacity-40">Severity</div>
                         <div className={`text-lg font-mono font-black ${injury.severity > 0 ? 'text-red-600' : 'text-sumo-ink/20'}`}>{injury.severity}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[7px] font-black uppercase opacity-40">Hits</div>
                         <div className="text-lg font-mono font-black text-sumo-ink/20">{injury.hits}/5</div>
                       </div>
                    </div>
                  </div>

                  {penalty > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-2 border-t border-red-100 pt-3 mt-1">
                      <Database size={10} className="text-red-700" />
                      <span className="text-[9px] font-black uppercase text-red-800 tracking-wider">Permanent Penalty: -{penalty} {attrMapping[attr]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Info */}
        <div className="bg-sumo-soft rounded-2xl p-4 border border-sumo-earth/30">
          <div className="flex items-start gap-3">
            <Activity className="text-sumo-earth mt-1" size={16} />
            <div className="space-y-3">
               <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-sumo-earth mb-1">Temporary Injuries</h4>
                 <p className="text-[10px] text-sumo-ink/70 leading-relaxed italic">
                   Each unique temporary injury adds +1 to your Base Fatigue. Severities range from 1 to 3.
                 </p>
               </div>
               <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-sumo-earth mb-1">Permanent Accumulation</h4>
                 <p className="text-[10px] text-sumo-ink/70 leading-relaxed italic">
                   Accumulating 5 "Hits" on a single attribute results in a permanent -1 to that stat. Permanent damage cannot be recovered.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
