const DisplayFooter = ({ tickerItems }: { tickerItems: string[] }) => {
 const items = tickerItems.length ? tickerItems : ['Great Agro Coffee · P.O Box 431420, Kasese, Uganda'];
 return <footer className="tv-broadcast-footer flex items-center shrink-0 border-t border-border"><div className="bg-primary text-primary-foreground px-10 py-6 text-lg font-semibold whitespace-nowrap">COFFEE & COMPANY</div><div className="tv-ticker-shell flex-1 min-w-0"><div className="tv-ticker-track">{[...items,...items].map((item,index) => <div key={index} className="tv-ticker-item"><span className="tv-ticker-dot" /><span>{item}</span></div>)}</div></div></footer>;
};
export default DisplayFooter;
