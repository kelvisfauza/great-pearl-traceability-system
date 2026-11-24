# Messaging boundaries

- Browser price and code notices use saved sources and registered recipients through `prepareBrowserSms`; caller text must never become a price or verification authority.
- Settings connection tests use a fixed template and the signed-in employee's saved destination, preventing the test channel from becoming a general sender.
- Keep the pure station-price formatter shared with the frontend, so secure sends and displayed previews cannot silently diverge.
- Retired alternate manual senders are side-effect-free; provider fallbacks remain in the central sender so old routes cannot bypass recipient checks.
- Ordinary browser email never initiates company-paid SMS; verified code/guarantor workflows and trusted background notices retain their dedicated delivery paths.