-- Create price history table to track daily pricing
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Arabica parameters
  arabica_outturn numeric,
  arabica_moisture numeric,
  arabica_fm numeric,
  arabica_buying_price numeric,
  -- Robusta parameters
  robusta_outturn numeric,
  robusta_moisture numeric,
  robusta_fm numeric,
  robusta_buying_price numeric,
  -- International markets
  ice_arabica numeric,
  robusta_international numeric,
  exchange_rate numeric,
  -- Local markets
  drugar_local numeric,
  wugar_local numeric,
  robusta_faq_local numeric,
  -- Metadata
  recorded_by text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(price_date)
);

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view price history
CREATE POLICY "Anyone can view price history" ON price_history
FOR SELECT TO authenticated USING (true);

-- Allow admins to manage price history
CREATE POLICY "Admins can manage price history" ON price_history
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND employees.role IN ('Super Admin', 'Administrator')
  )
);

-- Create function to auto-save price history when market_prices is updated
CREATE OR REPLACE FUNCTION save_price_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO price_history (
    price_date,
    arabica_outturn, arabica_moisture, arabica_fm, arabica_buying_price,
    robusta_outturn, robusta_moisture, robusta_fm, robusta_buying_price,
    ice_arabica, robusta_international, exchange_rate,
    drugar_local, wugar_local, robusta_faq_local,
    recorded_by
  ) VALUES (
    CURRENT_DATE,
    NEW.arabica_outturn, NEW.arabica_moisture, NEW.arabica_fm, NEW.arabica_buying_price,
    NEW.robusta_outturn, NEW.robusta_moisture, NEW.robusta_fm, NEW.robusta_buying_price,
    NEW.ice_arabica, NEW.robusta, NEW.exchange_rate,
    NEW.drugar_local, NEW.wugar_local, NEW.robusta_faq_local,
    'system'
  )
  ON CONFLICT (price_date) DO UPDATE SET
    arabica_outturn = EXCLUDED.arabica_outturn,
    arabica_moisture = EXCLUDED.arabica_moisture,
    arabica_fm = EXCLUDED.arabica_fm,
    arabica_buying_price = EXCLUDED.arabica_buying_price,
    robusta_outturn = EXCLUDED.robusta_outturn,
    robusta_moisture = EXCLUDED.robusta_moisture,
    robusta_fm = EXCLUDED.robusta_fm,
    robusta_buying_price = EXCLUDED.robusta_buying_price,
    ice_arabica = EXCLUDED.ice_arabica,
    robusta_international = EXCLUDED.robusta_international,
    exchange_rate = EXCLUDED.exchange_rate,
    drugar_local = EXCLUDED.drugar_local,
    wugar_local = EXCLUDED.wugar_local,
    robusta_faq_local = EXCLUDED.robusta_faq_local;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to save history on update
DROP TRIGGER IF EXISTS trigger_save_price_history ON market_prices;
CREATE TRIGGER trigger_save_price_history
AFTER INSERT OR UPDATE ON market_prices
FOR EACH ROW
WHEN (NEW.price_type = 'reference_prices')
EXECUTE FUNCTION save_price_history();