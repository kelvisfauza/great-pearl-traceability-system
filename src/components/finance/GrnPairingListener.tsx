import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addToQueue, getQueue, getScanSessionId, setPairedDevice } from "@/utils/grnQueue";

/**
 * Keeps the paired phone connected for the whole session, so finance staff only
 * pair once. Scans pushed from the phone open (or queue) GRNs even when the
 * scanner dialog is closed.
 */
const GrnPairingListener = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const onPhone = pathname.startsWith("/scan/");

  useEffect(() => {
    if (onPhone) return;
    const sessionId = getScanSessionId();
    const channel = supabase
      .channel(`grn-scan-${sessionId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "hello" }, ({ payload }: any) => {
        setPairedDevice(payload?.device || "Phone");
        toast.success(`Phone connected: ${payload?.device || "Phone"}`);
      })
      .on("broadcast", { event: "grn" }, ({ payload }: any) => {
        const ref = payload?.reference;
        if (!ref) return;
        setPairedDevice(payload?.device || "Phone");
        const pending = getQueue().filter((i) => !i.paid).length;
        addToQueue(ref);
        if (pending === 0) {
          toast.success(`Received ${ref} from your phone`);
          navRef.current(`/grn/${encodeURIComponent(ref)}`);
        } else {
          toast.info(`${ref} added to the pay queue`);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "ping", payload: {} });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onPhone]);

  return null;
};

export default GrnPairingListener;