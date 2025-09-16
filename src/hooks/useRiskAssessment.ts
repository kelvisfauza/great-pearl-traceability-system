import { useState, useEffect } from 'react';

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  recommendations: string[];
  requiresApproval: boolean;
  flaggedReasons: string[];
}

export const useRiskAssessment = () => {
  const assessExpenseRisk = (request: any): RiskAssessment => {
    let riskScore = 0;
    const flaggedReasons: string[] = [];
    const recommendations: string[] = [];

    const amount = parseFloat(request.amount) || 0;
    const details = request.details || {};
    const expenseType = details.expenseType || '';
    const reason = details.reason || '';
    const phoneNumber = details.phoneNumber || '';

    // Amount-based risk assessment
    if (amount > 500000) { // > 500K UGX
      riskScore += 30;
      flaggedReasons.push('High amount expense (>500K UGX)');
      recommendations.push('Verify expense documentation and receipts');
    } else if (amount > 200000) { // > 200K UGX
      riskScore += 15;
      flaggedReasons.push('Medium amount expense (>200K UGX)');
    }

    // Expense type risk factors
    const highRiskTypes = ['other', 'accommodation', 'maintenance'];
    const mediumRiskTypes = ['transport', 'meals', 'utilities'];
    
    if (highRiskTypes.includes(expenseType)) {
      riskScore += 20;
      flaggedReasons.push(`High-risk expense type: ${expenseType}`);
      recommendations.push('Request detailed justification and supporting documents');
    } else if (mediumRiskTypes.includes(expenseType)) {
      riskScore += 10;
      flaggedReasons.push(`Medium-risk expense type: ${expenseType}`);
    }

    // Reason quality assessment
    if (!reason || reason.length < 20) {
      riskScore += 15;
      flaggedReasons.push('Insufficient or vague expense reason');
      recommendations.push('Request more detailed explanation');
    }

    // Phone number validation
    const phoneRegex = /^[+]?[0-9\s\-()]{10,15}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      riskScore += 20;
      flaggedReasons.push('Invalid or missing phone number for payment');
      recommendations.push('Verify phone number for mobile money payment');
    }

    // Frequency check (would need historical data - simplified here)
    const requestDate = new Date(request.created_at);
    const isWeekend = requestDate.getDay() === 0 || requestDate.getDay() === 6;
    const isAfterHours = requestDate.getHours() > 18 || requestDate.getHours() < 8;
    
    if (isWeekend || isAfterHours) {
      riskScore += 10;
      flaggedReasons.push('Request submitted outside business hours');
      recommendations.push('Verify urgency and legitimacy');
    }

    // Emergency or overtime requests
    if (expenseType === 'overtime' || reason.toLowerCase().includes('emergency')) {
      riskScore += 15;
      flaggedReasons.push('Emergency or overtime expense claim');
      recommendations.push('Verify supervisor approval and time records');
    }

    // Determine risk level
    let riskLevel: RiskAssessment['riskLevel'];
    let requiresApproval = true;

    if (riskScore >= 60) {
      riskLevel = 'CRITICAL';
      recommendations.push('Requires thorough investigation before approval');
    } else if (riskScore >= 40) {
      riskLevel = 'HIGH';
      recommendations.push('Requires additional verification');
    } else if (riskScore >= 20) {
      riskLevel = 'MEDIUM';
      recommendations.push('Standard approval process recommended');
    } else {
      riskLevel = 'LOW';
      if (amount < 50000) { // < 50K UGX
        requiresApproval = false;
        recommendations.push('Low risk - can be fast-tracked');
      }
    }

    // General recommendations
    if (riskScore > 0) {
      recommendations.push('Verify requestor identity and department authorization');
    }

    return {
      riskLevel,
      riskScore,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      requiresApproval,
      flaggedReasons
    };
  };

  return {
    assessExpenseRisk
  };
};