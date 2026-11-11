import harvest from '@/assets/coffee-display-harvest.jpg';
import drying from '@/assets/coffee-journey-drying.jpg';
import roasting from '@/assets/coffee-journey-roasting.jpg';
import farm from '@/assets/coffee-journey-farm.jpg';
import quality from '@/assets/coffee-journey-quality.jpg';
import stock from '@/assets/coffee-journey-stock.jpg';
import cup from '@/assets/coffee-journey-cup.jpg';
import { Leaf, Package, ScanLine, Users } from 'lucide-react';
import type { DisplayData } from '@/hooks/useDisplayData';

export const journeyChapters = [
  { id:'roots', title:'The journey begins in the soil.', text:'A coffee tree takes care, time and the right growing conditions. Long before the first cup, the work begins on the farm.', image:harvest, label:'Growing coffee' },
  { id:'harvest', title:'Ripe cherries. A careful harvest.', text:'Picking mature cherries helps build a consistent lot. Each harvest carries the effort of the people who grew it.', image:harvest, label:'Harvesting' },
  { id:'people', title:'Behind every delivery, people.', text:'Farmers and suppliers connect coffee-growing communities with the buying station. Their work is the beginning of the coffee supply chain.', image:drying, label:'Our supplier community' },
  { id:'arabica-story', title:'Meet Arabica.', text:'Arabica is associated with higher-altitude growing regions and a wide range of cup flavours. Growing conditions and processing shape the final character.', image:harvest, label:'Coffee varieties' },
  { id:'robusta-story', title:'Meet Robusta.', text:'Robusta brings a different character to coffee: typically fuller body and more caffeine. It plays an important role in blends and everyday coffee.', image:harvest, label:'Coffee varieties' },
  { id:'drying-story', title:'Drying protects the harvest.', text:'Careful drying reduces moisture and prepares coffee for storage. Turning coffee and protecting it from rain help support consistency.', image:drying, label:'After the harvest' },
  { id:'arrival', title:'From the farm to our Store.', text:'At Great Agro Coffee, deliveries are recorded with the supplier, coffee type and weight. These details keep the coffee connected to its source.', image:drying, label:'Delivery & intake' },
  { id:'sampling-story', title:'A small sample. A closer look.', text:'Sampling gives Quality a portion of the delivery to examine. The sampling order connects the sample with the supplier and delivery.', image:harvest, label:'Sampling' },
  { id:'quality-story', title:'Quality is in the details.', text:'Moisture, defects and foreign matter all matter. Assessment helps the team understand the coffee before it moves further through the process.', image:drying, label:'Quality assessment' },
  { id:'processing-story', title:'Processing prepares the bean.', text:'Milling removes outer layers. Sorting helps separate coffee by its physical characteristics, preparing it for the next stage of its journey.', image:drying, label:'Milling & sorting' },
  { id:'stock-story', title:'Every batch carries a record.', text:'Stock batches bring deliveries together while keeping their source links. Recorded allocations connect coffee in stock with coffee dispatched.', image:drying, label:'Stock & traceability' },
  { id:'dispatch-story', title:'Ready for the next destination.', text:'A recorded dispatch connects the coffee, its weight and destination. The journey continues from the factory to the buyer.', image:drying, label:'Dispatch' },
  { id:'roast-story', title:'Heat reveals the character.', text:'Further along the coffee journey, roasting develops aroma, flavour and colour. Different roast approaches bring out different qualities in the bean.', image:roasting, label:'From green bean to roast' },
  { id:'cup-story', title:'The story reaches the cup.', text:'Grinding and brewing bring the journey together. Behind each cup are growing, harvesting, drying, processing and the people who made it possible.', image:roasting, label:'Farm to cup' },
];

export const CoffeeJourneySlide = ({ chapter }: { chapter: typeof journeyChapters[number] }) => <section className="relative h-full overflow-hidden">
  {['roots', 'harvest', 'drying-story', 'quality-story', 'stock-story', 'roast-story', 'cup-story'].includes(chapter.id) ? <>
    <img src={chapter.id === 'roots' ? farm : chapter.id === 'quality-story' ? quality : chapter.id === 'stock-story' ? stock : chapter.id === 'cup-story' ? cup : chapter.image} loading="lazy" width={1920} height={1088} alt={`${chapter.label} — illustrative coffee journey scene`} className="absolute inset-0 h-full w-full object-cover" />
    <div className="tv-company-shade absolute inset-0" />
  </> : <div className="absolute inset-0 flex items-center justify-end pr-24 bg-primary text-primary-foreground"><div className="border-l border-primary-foreground/30 pl-16 w-[440px]"><p className="text-9xl font-serif text-secondary">{String(journeyChapters.indexOf(chapter) + 1).padStart(2, '0')}</p><p className="text-4xl leading-relaxed mt-8">{chapter.label}</p><Leaf className="h-24 w-24 mt-12 text-secondary" /></div></div>}
  <div className="relative h-full flex flex-col justify-center px-16 max-w-[1120px]">
    <p className="text-secondary text-2xl mb-7">THE COFFEE JOURNEY · {chapter.label}</p>
    <h2 className="tv-on-photo text-8xl leading-tight">{chapter.title}</h2>
    <p className="tv-on-photo mt-8 text-4xl leading-relaxed">{chapter.text}</p>
    <p className="tv-on-photo-muted mt-10 text-2xl">Great Agro Coffee · Kasese, Uganda</p>
  </div>
</section>;

export const SupplierShowcaseSlide = ({ data, offset = 0 }: { data: DisplayData; offset?: number }) => <section className="h-full px-16 py-10 flex flex-col gap-8">
  <div className="flex items-center gap-5"><Users className="h-12 w-12 text-primary" /><div><p className="text-2xl text-primary">OUR COFFEE COMMUNITY</p><h2 className="text-7xl mt-3">{offset ? 'More of our leading suppliers' : 'Our top suppliers'}</h2></div></div>
  <p className="text-3xl text-muted-foreground">By kilograms in the delivery records available to this display.</p>
  <div className="flex-1 flex flex-col justify-center divide-y border-y border-border">{data.topSuppliers.slice(offset, offset + 4).map((supplier,index) => <div key={supplier.name} className="flex items-center gap-8 py-6"><span className="text-5xl text-secondary w-24">{String(offset + index + 1).padStart(2,'0')}</span><p className="text-4xl flex-1 min-w-0 break-words">{supplier.name}</p><p className="text-5xl tabular-nums">{supplier.kgs.toLocaleString('en-UG')} <span className="text-2xl text-muted-foreground">kg</span></p></div>)}</div>
  {!data.topSuppliers.slice(offset,offset+4).length && <p className="text-3xl text-muted-foreground">Supplier rankings are not available yet.</p>}
  <p className="text-2xl text-muted-foreground">Thank you to the suppliers who keep the coffee journey moving.</p>
</section>;

export const JourneyOverviewSlide = () => <section className="h-full p-16 flex flex-col justify-center gap-12"><p className="text-2xl text-primary">GREAT AGRO COFFEE</p><h2 className="text-8xl">One bean. Many hands.</h2><p className="text-4xl max-w-[1250px] leading-relaxed">Coffee connects growers, suppliers, quality teams, processors and buyers. Each stage adds care—and a record of where the coffee has been.</p><div className="grid grid-cols-4 gap-8 border-t pt-10">{[{icon:Leaf,label:'Grow & harvest'},{icon:Users,label:'Deliver & assess'},{icon:Package,label:'Process & store'},{icon:ScanLine,label:'Trace & dispatch'}].map(({icon:Icon,label}) => <div key={label}><Icon className="h-12 w-12 text-primary mb-5" /><h3 className="text-4xl">{label}</h3></div>)}</div></section>;