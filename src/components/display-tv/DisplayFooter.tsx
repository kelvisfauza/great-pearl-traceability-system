interface DisplayFooterProps {
  tickerItems: string[];
}

const DisplayFooter = ({ tickerItems }: DisplayFooterProps) => {
  const items = tickerItems.length > 0 ? tickerItems : ["Waiting for fresh internal purchases and market updates..."];
  const repeatedItems = [...items, ...items];

  return (
    <footer className="border-t border-border/50 bg-card/80 px-0 py-0 backdrop-blur">
      <div className="tv-ticker-shell">
        <div className="tv-ticker-track">
          {repeatedItems.map((item, index) => (
            <div key={`${item}-${index}`} className="tv-ticker-item">
              <span className="tv-ticker-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default DisplayFooter;
