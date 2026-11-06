---
name: ContractorFoil
description: Company contacts and current material prices in a clear operational workspace.
colors:
  primary: "#245bd6"
  primary-hover: "#1949b8"
  primary-soft: "#eaf0ff"
  ink: "#20303c"
  muted: "#596b78"
  canvas: "#f2f5f7"
  surface: "#ffffff"
  rail: "#172f40"
  rail-text: "#cedbe5"
  border: "#dce3e8"
  control-border: "#718598"
  danger: "#b62935"
  danger-soft: "#fff0f0"
  success: "#21654c"
  success-soft: "#edf7f1"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 600
rounded:
  control: "6px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "12px"
  md: "16px"
  section: "24px"
  lg: "32px"
  page: "40px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  record-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

## Overview

ContractorFoil uses a reference directory’s dependable alignment within a familiar web application. The shell frames a company index; saved records and editable drafts have visibly different roles. Brand character comes from deep slate navigation, mineral surfaces, exact spacing and stable data columns.

The implementation is code-first. This document records the implemented system; rendered accessibility acceptance and finish review are required before delivery.

## Colors

Cobalt identifies primary actions, links, keyboard focus and selection. Slate carries navigation. White record surfaces sit on a mineral-gray workspace. Red is reserved for errors and destructive actions; green accompanies confirmed success. A neutral contact date has no urgency color.

Tokens are defined in `frontend/src/index.css`. Supporting neutral tones separate labels, secondary values and fine rules without adding competing accents.

Resting form controls use a separate slate boundary token with at least 3:1 contrast on the white input surface. Panel separators retain the lighter border token; focus and invalid states keep their cobalt and red treatments.

## Typography

One system sans-serif family serves headings, controls and data. Fixed sizes keep application density predictable. Prices and dates use tabular numerals. The public introduction uses the same family at a larger scale; app labels never use a display face.

Company names, addresses, additional material descriptions and notes wrap rather than hiding their only readable value. Stored precision remains editable even when a price is displayed to two decimal places.

## Layout

Desktop uses a 238px navigation rail, 70px workspace header and a main region with 40px padding. At narrower desktop sizes the rail and padding contract. The semantic company table keeps company identity and NIP together, then phone, contact date and prices in aligned columns.

At 767px and below, navigation becomes a compact header and the table becomes complete company cards. Forms and details become single columns as needed; below 420px form fields stack. An empty result, a failed load and an empty register have separate content and actions.

## Elevation & Depth

Record panels use a fine border and no shadow. The canvas and rail establish hierarchy through tone. A soft offset shadow is reserved for the native confirmation dialog; its backdrop protects focus during a destructive or discard decision.

## Shapes

Controls use 6px radii and minimum 44px heights. Panels use 12px radii. The brand mark is a small geometric stack of three sheets. Authored SVG icons share a 24px viewBox, rounded line ends and 1.7px strokes.

## Components

Primary buttons use cobalt and name the action. Secondary actions use a neutral outlined button. Labels persist above fields; help text and field errors connect through accessible descriptions. Invalid submissions expose an error summary, preserve the draft and provide field links.

Each failed submission returns focus to its summary, including repeated errors. Inline sign-in focuses the editable password and returns there after a failed attempt. Successful renewal returns focus to the next deliberate form action, the safe modal action, or the persistent main region when a protected read reloads. Renewal never repeats a save or deletion automatically.

Create and edit use one routed form. A dirty draft prompts before navigation and warns before browser unload. Save buttons submit once while pending. Confirmed failures preserve input; uncertain writes expose a read-before-retry reconciliation step. Session expiry offers sign-in in place.

Native confirmation dialogs name the company or the discarded draft. The safe action receives initial focus, Escape cancels when idle and keyboard focus stays within the dialog. Loading skeletons and short control transitions respect reduced motion.

## Do's and Don'ts

- Keep navigation and controls familiar; use alignment and content for character.
- Show zero, missing prices and optional dates distinctly.
- Preserve list search and sorting through record workflows.
- Use only actual records for overview counts and recent update dates.
- Keep contact dates neutral and material units explicit.
- Do not introduce decorative gradients, fabricated history, unsupported claims or emoji.
- Do not turn a failed or uncertain request into an empty state or a success message.
