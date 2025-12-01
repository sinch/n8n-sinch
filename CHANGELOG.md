# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-alpha-1] - 2025-12-01

### Changed

- Removed all external dependencies to pass n8n verification (zero dependencies)
- Replaced `i18n-iso-countries` with custom country code utility
- Replaced `google-libphonenumber` with custom phone validation utility
- Phone validation now uses basic format checking (invalid numbers rejected by API)

### Added

- Custom utilities for country codes and phone validation (100+ countries)

## [1.0.0-alpha-0] - 2024-11-06

**⚠️ ALPHA RELEASE - For internal testing only**

### Added

- Initial alpha release
- Send SMS message via Conversations API
- List messages with filtering
- OAuth2.0 authentication with token caching (55-minute expiry)
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


