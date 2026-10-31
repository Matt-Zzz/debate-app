Apple Distribution public certificate
=====================================

File: AppleDistribution-HaoranZhang.cer (DER-encoded X.509 certificate)
Identity: Apple Distribution: Haoran Zhang (7478P3N2NF)
SHA-256: A4A82301717CA49A5839A799690C6F4F615D1D04C8481821E0D1B52FBD094DB0

This file contains only the public certificate exported from macOS Keychain.
It does NOT contain the private signing key. The certificate alone cannot sign
or upload an app. Authorized release builders also need the matching private
key in their local Keychain and the correct provisioning profile.

Never commit .p12, .pfx, private .pem/.key files, provisioning profiles, passwords,
API keys, or App Store Connect private API keys. Transfer private signing material
only through a separate approved secure channel, never this repository.

Inspect this certificate with:
  openssl x509 -inform DER -in certificates/AppleDistribution-HaoranZhang.cer -noout -subject -issuer -dates -fingerprint -sha256

Security note: test.pem was tracked by older repository commits. Removing it
from the current tree does not erase Git history or revoke the key. Treat that
AWS SSH private key as exposed and replace it if still authorized on any server.
History rewriting and server access changes are separate coordinated operations.
