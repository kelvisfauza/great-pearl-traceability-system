const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface YoStatusResolution {
  checkedReference?: string;
  rawResponse?: string;
  resolvedStatus: "completed" | "failed" | "pending";
  statusCode?: string;
  statusMessage?: string;
  transportStatus?: string;
}

export async function resolveYoTransactionStatus(
  username: string,
  password: string,
  references: Array<string | null | undefined>,
): Promise<YoStatusResolution> {
  const uniqueReferences = [...new Set(references.map((ref) => ref?.trim()).filter(Boolean))] as string[];

  if (uniqueReferences.length === 0) {
    return {
      resolvedStatus: "pending",
      statusMessage: "No Yo reference available to check",
    };
  }

  let lastPendingResult: YoStatusResolution | null = null;
  let lastNotFoundResult: YoStatusResolution | null = null;

  for (const reference of uniqueReferences) {
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>actransactioncheckstatus</Method>
    <PrivateTransactionReference>${escapeXml(reference)}</PrivateTransactionReference>
  </Request>
</AutoCreate>`;

    console.log(`[Yo Status] Checking reference: ${reference}`);

    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "Content-Transfer-Encoding": "text",
      },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Yo Status] Response for ${reference}: ${responseText}`);

    const txStatusMatch = responseText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/i);
    const statusMatch = responseText.match(/<Status>(.*?)<\/Status>/i);
    const statusCodeMatch = responseText.match(/<StatusCode>(.*?)<\/StatusCode>/i);
    const statusMessageMatch = responseText.match(/<StatusMessage>(.*?)<\/StatusMessage>/i);

    const txStatus = txStatusMatch?.[1]?.trim()?.toUpperCase();
    const transportStatus = statusMatch?.[1]?.trim()?.toUpperCase();
    const statusCode = statusCodeMatch?.[1]?.trim();
    const statusMessage = statusMessageMatch?.[1]?.trim();

    if (txStatus === "SUCCEEDED" || txStatus === "COMPLETED") {
      return {
        checkedReference: reference,
        rawResponse: responseText,
        resolvedStatus: "completed",
        statusCode,
        statusMessage,
        transportStatus,
      };
    }

    if (txStatus === "FAILED" || txStatus === "EXPIRED" || txStatus === "CANCELLED") {
      return {
        checkedReference: reference,
        rawResponse: responseText,
        resolvedStatus: "failed",
        statusCode,
        statusMessage,
        transportStatus,
      };
    }

    const result: YoStatusResolution = {
      checkedReference: reference,
      rawResponse: responseText,
      resolvedStatus: "pending",
      statusCode,
      statusMessage,
      transportStatus,
    };

    if (transportStatus === "ERROR" && statusCode === "-30") {
      lastNotFoundResult = result;
      continue;
    }

    lastPendingResult = result;
  }

  return lastPendingResult ?? lastNotFoundResult ?? {
    resolvedStatus: "pending",
    statusMessage: "Yo status is still pending",
  };
}