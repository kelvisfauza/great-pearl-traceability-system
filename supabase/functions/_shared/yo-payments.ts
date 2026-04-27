/**
 * Yo Payments Uganda - Mobile Money Payout Helper
 * API Docs: https://paymentsapi1.yo.co.ug/ybs/task.php
 * Uses XML-based API for acdepositfunds (sending money to mobile money accounts)
 */

const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

interface YoPayoutParams {
  phone: string;       // Must be 256XXXXXXXXX format
  amount: number;
  narrative: string;   // Payment description/reason
}

interface YoPayoutResult {
  success: boolean;
  transactionRef?: string;
  statusMessage?: string;
  errorMessage?: string;
  rawResponse?: string;
}

/**
 * Determine the AccountProviderCode based on the phone number prefix.
 * MTN Uganda: 077, 078, 076
 * Airtel Uganda: 070, 075, 074
 */
function getProviderCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Remove country code to get local number
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;

  if (local.startsWith("077") || local.startsWith("078") || local.startsWith("076")) {
    return "MTN";
  }
  if (local.startsWith("070") || local.startsWith("075") || local.startsWith("074")) {
    return "AIRTEL";
  }
  // Default to MTN
  return "MTN";
}

/**
 * Build the XML request body for Yo Payments acwithdrawfunds (send money TO a phone)
 */
function buildYoXmlRequest(username: string, password: string, params: YoPayoutParams): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>acwithdrawfunds</Method>
    <NonBlocking>TRUE</NonBlocking>
    <Amount>${params.amount}</Amount>
    <Account>${params.phone}</Account>
    <AccountProviderCode>${getProviderCode(params.phone)}</AccountProviderCode>
    <Narrative>${escapeXml(params.narrative)}</Narrative>
  </Request>
</AutoCreate>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Parse Yo Payments XML response
 * Success response contains: <Status>OK</Status> and <TransactionReference>...</TransactionReference>
 * Error response contains: <Status>ERROR</Status> and <StatusMessage>...</StatusMessage>
 */
function parseYoResponse(xml: string): YoPayoutResult {
  const statusMatch = xml.match(/<Status>(.*?)<\/Status>/);
  const status = statusMatch?.[1]?.trim();

  const txRefMatch = xml.match(/<TransactionReference>(.*?)<\/TransactionReference>/);
  const statusMsgMatch = xml.match(/<StatusMessage>(.*?)<\/StatusMessage>/);
  const statusCodeMatch = xml.match(/<StatusCode>(.*?)<\/StatusCode>/);
  const statusCode = statusCodeMatch?.[1]?.trim();

  // StatusCode -22 means "extra authorization required" — treat as pending, not failure
  const isPendingAuthorization = statusCode === '-22';

  if (status === "OK" || isPendingAuthorization) {
    return {
      success: !isPendingAuthorization,
      transactionRef: txRefMatch?.[1]?.trim() || undefined,
      statusMessage: isPendingAuthorization
        ? `StatusCode:-22 ${statusMsgMatch?.[1]?.trim() || 'Pending authorization'}`
        : (statusMsgMatch?.[1]?.trim() || "Transaction accepted"),
      rawResponse: xml,
    };
  }

  return {
    success: false,
    errorMessage: statusMsgMatch?.[1]?.trim() || `Yo Payments returned status: ${status}`,
    statusMessage: statusMsgMatch?.[1]?.trim(),
    rawResponse: xml,
  };
}

/**
 * Send money to a mobile money account via Yo Payments
 */
export async function yoPayout(params: YoPayoutParams): Promise<YoPayoutResult> {
  const username = Deno.env.get("YO_API_USERNAME");
  const password = Deno.env.get("YO_API_PASSWORD");

  if (!username || !password) {
    return { success: false, errorMessage: "Yo Payments API credentials not configured" };
  }

  const xmlBody = buildYoXmlRequest(username, password, params);

  console.log(`[Yo Payments] Sending UGX ${params.amount} to ${params.phone} (${getProviderCode(params.phone)})`);

  try {
    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "Content-Transfer-Encoding": "text",
      },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Yo Payments] HTTP ${response.status}, Response: ${responseText}`);

    if (!response.ok) {
      return {
        success: false,
        errorMessage: `Yo Payments HTTP error: ${response.status}`,
        rawResponse: responseText,
      };
    }

    return parseYoResponse(responseText);
  } catch (error) {
    const errMsg = error instanceof Error ? (error as Error).message : "Unknown error";
    console.error(`[Yo Payments] Error: ${errMsg}`);
    return { success: false, errorMessage: errMsg };
  }
}

/**
 * Normalize phone number to 256XXXXXXXXX format
 */
export function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "256" + clean.slice(1);
  if (!clean.startsWith("256")) clean = "256" + clean;
  return clean;
}
