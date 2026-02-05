import { Phone, Mail, Globe, MapPin, Clock } from 'lucide-react';

const ContactSlide = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fade-in">
      {/* Logo */}
      <img 
        src="/lovable-uploads/great-pearl-coffee-logo.png" 
        alt="Great Pearl Coffee" 
        className="h-32 w-auto mb-6 animate-pulse"
      />
      
      <h2 className="text-5xl font-bold text-white mb-4">Get In Touch</h2>
      <p className="text-white/70 text-2xl mb-12">Partner with Uganda's Premier Coffee Exporter</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Phone */}
        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="p-4 bg-green-500/30 rounded-full">
            <Phone className="h-10 w-10 text-green-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Call Us Today</p>
            <p className="text-3xl font-bold text-white">+256 393 001 626</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="p-4 bg-blue-500/30 rounded-full">
            <Mail className="h-10 w-10 text-blue-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Email Us</p>
            <p className="text-2xl font-bold text-white">info@greatpearlcoffee.com</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="p-4 bg-amber-500/30 rounded-full">
            <MapPin className="h-10 w-10 text-amber-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Visit Us</p>
            <p className="text-xl font-bold text-white">Kasese, Western Uganda</p>
          </div>
        </div>

        {/* Website */}
        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="p-4 bg-purple-500/30 rounded-full">
            <Globe className="h-10 w-10 text-purple-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Website</p>
            <p className="text-xl font-bold text-white">www.greatpearlcoffee.com</p>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="mt-10 flex items-center gap-3 text-white/60">
        <Clock className="h-5 w-5" />
        <span>Open Monday - Saturday | 7:00 AM - 6:00 PM EAT</span>
      </div>

      <p className="mt-6 text-2xl text-green-400 font-semibold animate-pulse">
        🌱 From Farm to Cup, Quality You Can Trust 🌱
      </p>
    </div>
  );
};

export default ContactSlide;
