# Electronic Signature Evidence

Update 8 adds stronger evidence capture for lease signatures. This is not legal advice, but it gives administrators a better technical record for ESIGN/UETA review.

## Captured at signing

Each signature request now stores:

- typed signature text
- signed timestamp
- IP address
- user agent
- explicit electronic-signature consent flag
- exact consent disclosure text shown to the signer
- consent accepted timestamp
- SHA-256 hash of the lease text reviewed at signing
- SHA-256 evidence hash tying signer, consent, timestamp, IP/user agent, signature text, request ID, and lease text hash together

## Captured at final PDF generation

The final signed lease PDF is hashed with SHA-256. The hash is stored on:

- the generated Document record as `sha256Hash`
- each signed SignatureRequest as `finalPdfHash`
- audit/security metadata for the final lease generation event

## Why this matters

The previous workflow recorded a typed name, timestamp, IP address, and user agent. This update adds explicit consent and tamper-evidence metadata so an administrator can show what was signed, what consent was accepted, and whether the final PDF matches the stored hash.

## Production note

Before relying on the workflow for actual leases, have counsel review the consent language, withdrawal process, paper-copy process, final document retention policy, and jurisdiction-specific disclosures.
