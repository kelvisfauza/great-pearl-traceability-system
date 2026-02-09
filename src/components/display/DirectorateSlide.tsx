import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

const staffImages = [
  { src: '/images/staff/directors-trio.png', caption: 'Management Team' },
  { src: '/images/staff/management-team.png', caption: 'Leadership & Operations' },
  { src: '/images/staff/full-team.png', caption: 'Our Dedicated Team' },
  { src: '/images/staff/admin-office.png', caption: 'Administration' },
  { src: '/images/staff/operations-head.png', caption: 'Operations Department' },
  { src: '/images/staff/it-department.png', caption: 'IT Department' },
  { src: '/images/staff/team-celebration.png', caption: 'Team Celebration' },
  { src: '/images/staff/team-social.png', caption: 'Staff Social Event' },
];

const DirectorateSlide = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % staffImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const current = staffImages[activeIndex];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Users className="h-8 w-8 text-green-400" />
          <h2 className="text-4xl font-bold text-white">Our Directorate</h2>
        </div>
        <p className="text-white/60 text-lg">The People Behind Great Pearl Coffee</p>
      </div>

      {/* Main featured image */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl mx-auto" style={{ maxHeight: '55vh' }}>
        <img
          src={current.src}
          alt={current.caption}
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ maxHeight: '55vh' }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <p className="text-2xl font-semibold text-white">{current.caption}</p>
          <p className="text-white/60 text-sm">Great Pearl Coffee • Kasese, Uganda</p>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex justify-center gap-2 mt-4">
        {staffImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
              i === activeIndex ? 'border-green-400 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'
            }`}
          >
            <img src={img.src} alt={img.caption} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default DirectorateSlide;
