const calculateSuggestedPrice = () => {
  if (!selectedRecord) return 0;

  const coffeeType = selectedRecord.coffee_type?.toLowerCase();
  let basePrice = 0;

  if (coffeeType?.includes('arabica') || coffeeType?.includes('drugar')) {
    basePrice = prices.drugarLocal;
  } else if (coffeeType?.includes('robusta')) {
    basePrice = prices.robustaFaqLocal;
  } else {
    basePrice = prices.drugarLocal;
  }

  const moisture = parseFloat(assessmentForm.moisture) || 0;
  const group1 = parseFloat(assessmentForm.group1_defects) || 0;
  const group2 = parseFloat(assessmentForm.group2_defects) || 0;
  const below12 = parseFloat(assessmentForm.below12) || 0;
  const pods = parseFloat(assessmentForm.pods) || 0;
  const husks = parseFloat(assessmentForm.husks) || 0;
  const stones = parseFloat(assessmentForm.stones) || 0;

  // Penalty calculations as per Excel logic
  let deduction = 0;
  deduction += group1 * 3;
  deduction += group2 * 1;
  deduction += below12 * 1;
  deduction += pods * 1;
  deduction += husks * 1;
  deduction += stones * 1;

  let adjustedPrice = basePrice - deduction;

  // Moisture penalty
  if (moisture > 13) {
    const excess = moisture - 13;
    adjustedPrice -= basePrice * (excess / 100);
  }

  // Ensure adjusted price doesn't go below 0
  adjustedPrice = Math.max(adjustedPrice, 0);

  // Multiply by weight to get total
  const total = adjustedPrice * selectedRecord.kilograms;

  return Math.round(total);
};
