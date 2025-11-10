# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-alpha-0] - 2024-11-06

**⚠️ ALPHA RELEASE - For internal testing only**

### Added

- Initial alpha release
- Send SMS message via Conversations API
- List messages with filtering
- OAuth2.0 authentication support with token caching (55-minute expiry)
- Basic authentication support
- Regional endpoint selection (US/EU/BR)
- Phone number normalization to E.164 format
- Custom callback URL support
- Message metadata support
- Comprehensive error handling
- Unit and integration tests

### Known Limitations

- Only SMS channel supported (WhatsApp, RCS coming soon)
- No MMS support in initial release
- List messages pagination requires manual handling
- OAuth2.0 token cache is in-memory (not persisted across restarts)


