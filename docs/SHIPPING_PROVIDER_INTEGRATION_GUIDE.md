# Shipping Provider Integration Guide

This guide explains how to collect and configure shipping-provider data for this project.

## Scope

- Provider credentials and API endpoint setup.
- Pickup point and geographic mapping data.
- Required verification checklist before enabling a provider in admin settings.

## Required data from each provider

1. Account and environment
- Provider account (business/seller account).
- Sandbox URL and Production URL.
- IP whitelist or callback-domain allowlist requirements.

2. Authentication data
- API token / API key.
- Secret key or partner secret.
- Shop ID / Merchant ID.

3. Pickup point profile
- Pickup name.
- Pickup phone.
- Pickup address.
- Province code.
- District code.
- Ward code.

4. Logistics integration data
- Service IDs (standard, express, same-day) if provider requires them.
- COD support rules.
- Return flow endpoints and reason codes.
- Webhook endpoints for shipment status updates.

## Mapping to admin settings fields

Use the Shipping Settings page and map data as follows:

- API token -> token
- Sandbox/Prod API URL -> apiBaseUrl
- Shop/Merchant identifier -> shopId
- Pickup details -> pickupName, pickupPhone, pickupAddress
- Region codes -> pickupProvinceCode, pickupDistrictCode, pickupWardCode
- Shipment callback URL -> leadTimeWebhookUrl

## Suggested onboarding flow

1. Register provider account and request API access.
2. Collect sandbox credentials and perform smoke tests.
3. Configure provider in admin settings with sandbox values.
4. Validate fee quotation API for at least 3 destination regions.
5. Validate shipment creation/cancel flow.
6. Validate webhook callback signature and retry handling.
7. Switch to production credentials.
8. Enable provider in admin and set as defaultProvider when ready.

## Test checklist before go-live

- Fee quote success for COD and non-COD orders.
- Correct lead time returned and displayed.
- Shipment status lifecycle synchronized to order status.
- Invalid token scenario handled gracefully.
- Timeout/retry behavior verified.
- Production webhook can reach API endpoint and pass signature verification.

## Security recommendations

- Rotate provider tokens periodically.
- Do not expose secret keys in client-side code.
- Keep provider callbacks behind signature verification.
- Log failed provider requests with provider key and request id only (never log secrets).
