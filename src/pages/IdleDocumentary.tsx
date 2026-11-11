import PriceDisplay from './PriceDisplay';

// The inactivity destination and manual display share the same company presentation.
const IdleDocumentary = () => (
  <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
    <PriceDisplay companyMode />
  </div>
);

export default IdleDocumentary;
