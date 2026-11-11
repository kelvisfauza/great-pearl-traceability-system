import { Leaf, ScanLine, Factory, ArrowUpRight } from 'lucide-react';
import harvest from '@/assets/coffee-display-harvest.jpg';
import yedaSeal from '@/assets/yeda-coffee-company-seal.png.asset.json';
const BrandSignatureSlide = ({ variant = 'intro' }: { variant?: 'intro' | 'outro' }) => <section className="tv-company-story relative h-full overflow-hidden">
  <img src={harvest} width={1920} height={1088} alt="Ripe coffee cherries on a coffee plant" className="absolute inset-0 h-full w-full object-cover" />
  <div className="tv-company-shade absolute inset-0" />
  <div className="relative z-10 flex h-full flex-col justify-between px-16 py-14">
    <div className="max-w-[1040px]">
      <p className="tv-on-photo-muted text-xl flex items-center gap-3"><span className="h-px w-16 bg-secondary" />KASESE, UGANDA</p>
      <h2 className="tv-on-photo mt-8 text-[112px] leading-[1.02]">Great Agro<br />Coffee<span className="text-secondary">.</span></h2>
      <p className="tv-on-photo mt-7 text-3xl max-w-[780px] leading-relaxed">{variant === 'intro' ? 'Ugandan coffee. Connected from supplier to market.' : 'Every delivery has a story. Every batch carries it forward.'}</p>
      <div className="mt-6 flex items-center gap-4">
        <img src={yedaSeal.url} alt="YEDA Coffee Company Limited seal" className="h-16 w-16 rounded-full bg-white/90 p-1 object-contain" />
        <p className="tv-on-photo-muted text-xl">A member of YEDA COFFEE COMPANY LIMITED</p>
      </div>
    </div>
    <div className="tv-on-photo grid grid-cols-3 gap-12 border-t border-secondary/50 pt-7 max-w-[1450px]">
      {[{ icon:Leaf,title:'Arabica & Robusta',text:'Coffee buying in Kasese' },{ icon:Factory,title:'Quality & milling',text:'Assessment, processing and stock' },{ icon:ScanLine,title:'Batch traceability',text:'Recorded deliveries to dispatch' }].map(item => <div key={item.title} className="flex gap-5"><item.icon className="h-9 w-9 text-secondary shrink-0" /><div><h3 className="text-3xl">{item.title}</h3><p className="tv-on-photo-muted mt-2 text-xl">{item.text}</p></div></div>)}
    </div>
    <div className="absolute right-16 bottom-12 tv-on-photo"><ArrowUpRight className="h-16 w-16" /></div>
  </div>
</section>;
export default BrandSignatureSlide;
