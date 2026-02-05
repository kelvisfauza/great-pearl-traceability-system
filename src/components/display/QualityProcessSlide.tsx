import { CheckCircle, Award, Sparkles, ThumbsUp } from 'lucide-react';

const QualityProcessSlide = () => {
  const qualitySteps = [
    { icon: CheckCircle, title: 'Hand Selection', desc: 'Every cherry picked at peak ripeness', color: 'text-green-400', bg: 'bg-green-500/20' },
    { icon: Sparkles, title: 'Wet Processing', desc: 'Premium washed coffee perfection', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { icon: Award, title: 'Quality Grading', desc: 'Strict quality control standards', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { icon: ThumbsUp, title: 'Export Ready', desc: 'Meeting international standards', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Award className="h-12 w-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Quality First, Always</h2>
      </div>

      <p className="text-white/70 text-xl text-center max-w-3xl mb-12">
        Our rigorous quality control ensures only the finest beans reach your cup
      </p>

      <div className="grid grid-cols-4 gap-6 max-w-6xl">
        {qualitySteps.map((step, index) => (
          <div key={step.title} className="relative">
            {/* Connector line */}
            {index < qualitySteps.length - 1 && (
              <div className="absolute top-16 left-1/2 w-full h-1 bg-gradient-to-r from-white/30 to-white/10 z-0" />
            )}
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className={`w-32 h-32 rounded-full ${step.bg} border-4 border-white/20 flex items-center justify-center mb-4`}>
                <step.icon className={`h-16 w-16 ${step.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
              <p className="text-white/60">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex gap-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-green-400">99%</p>
          <p className="text-white/60">Export Quality Rate</p>
        </div>
        <div className="w-px bg-white/20" />
        <div className="text-center">
          <p className="text-5xl font-bold text-blue-400">SCA</p>
          <p className="text-white/60">Certified Standards</p>
        </div>
        <div className="w-px bg-white/20" />
        <div className="text-center">
          <p className="text-5xl font-bold text-amber-400">A+</p>
          <p className="text-white/60">Grade Coffee</p>
        </div>
      </div>
    </div>
  );
};

export default QualityProcessSlide;
