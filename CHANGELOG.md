### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### v1.0.0-alpha-0.4

> 23 March 2026

- Replace placeholder SVG with official Sinch logo
- Create GitHub Actions publish workflow with provenance
- Fix example workflow type and credentials casing
- Add Installation and Compatibility sections to README
- Rename List operation to Get Many per n8n conventions

#### v1.0.0-alpha-0.3

- Add prepublishOnly script to package.json
- Add `strict: true` to package.json n8n block for verification eligibility
- Add eslint-plugin-n8n-nodes-base and fix all lint violations
- Add Return All and Limit pagination for list messages
- Add continueOnFail() error handling in execute loop
- Fix error constructors and add itemIndex to all throws
- Add Sinch.node.json codex metadata file
- Add n8nNodesApiVersion to package.json n8n block
- Create placeholder SVG icon and re-enable ESLint rule

#### v1.0.0-alpha-0.2

- Mask keyId credential field as password in n8n UI
- Fix n8n community node package review issues
- Remove deprecated helpers.request fallback in sinchHttp

#### v1.0.0-alpha-0.1

- Remediate high Snyk transitive vulnerabilities
- Node version upgrade to 24
- Restructure project to remove src directory
- Remove runtime dependencies from package.json
- Add custom phone/country utilities to replace runtime dependencies
- Rename credential file to singular for n8n verification

#### [v1.0.0-alpha-0.0](https://github.com/sinch/n8n-sinch/releases/tag/v1.0.0-alpha-0.0)

- Feature package json
- Fixed package name
- Fixed package.json for github publish

#### v1.0.0-alpha.1

> 1 December 2025

- Update phone number normalization tests
- Remove external dependencies, add custom utilities for country codes and phone validation

#### v1.0.0-alpha.0

> 1 December 2025

- Initial commit with project setup including package.json, .gitignore, LICENSE, and CI pipeline configuration
- Added TypeScript dependencies and build scripts for n8n community node development
- Readme and reference engineering related docs
- Test improvements
