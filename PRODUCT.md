# ContractorFoil

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People maintaining their own company contact records and current material prices. The precise industry and business size are not established by the repository.

## Product Purpose

Keep company details, current material prices in PLN/kg, a contact date and notes together in an authenticated workspace. Users can find, add, inspect, edit and delete their own records.

## Operating Context

The existing React and TypeScript application uses an Express API and MongoDB. Desktop and mobile browser workflows must preserve deep links and user input when a request fails.

## Capabilities and Constraints

- Company name, NIP, phone number and address; optional contact date and notes.
- Current prices for FOD colorless, FOD color and an additional material, plus an optional additional material description. FOD has no verified expansion.
- NIP and phone are strings. Prices use PLN/kg; zero differs from an absent price and storage precision is preserved.
- Contact date is neutral: its historical meaning is unresolved. Record timestamps do not establish contact or price history.
- Search and sorting, account creation and sign-in, owner-scoped records, and an explicit Google Maps link for an address.
- CAPTCHA is disabled by default and must not cause third-party runtime requests unless explicitly configured.
- No established reminders, reports, route optimization, teams, push notifications, or historical prices.

## Brand Commitments

Retain the ContractorFoil name. Maintained interface and documentation use concise English without emoji or unsupported claims.

## Evidence on Hand

The existing schema, route contracts, source audits and decision brief. No verified customer count, testimonials, commercial results or production benchmarks. Demonstration records must be labeled as fictional.

## Product Principles

- Make the saved record and its editable draft distinct.
- Preserve precision and legacy values during unrelated edits.
- Give each request outcome a visible state and recovery action.
- Prefer familiar keyboard-accessible controls and direct navigation.

## Accessibility & Inclusion

Persistent labels, visible focus, semantic tables and forms, keyboard operation, responsive layouts, reduced motion and errors associated with their fields are required by the implementation brief.
