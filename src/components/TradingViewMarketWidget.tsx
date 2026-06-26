import { useEffect, useRef } from "react";

interface TradingViewMarketWidgetProps {
  symbol?: string;
  className?: string;
}

const TradingViewMarketWidget = ({
  symbol = "CAPITALCOM:COFFEE",
  className = "",
}: TradingViewMarketWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any prior render
    container.innerHTML = "";

    // TradingView requires the script tag to live INSIDE a
    // .tradingview-widget-container element, alongside a
    // .tradingview-widget-container__widget child.
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify({
      symbols: [[`Coffee (${symbol})`, symbol]],
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "en",
      colorTheme: "dark",
      autosize: true,
      showVolume: true,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "ytd|1D", "5y|1W"],
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container w-full h-full ${className}`}
      style={{ minHeight: 400 }}
    />
  );
};

export default TradingViewMarketWidget;
