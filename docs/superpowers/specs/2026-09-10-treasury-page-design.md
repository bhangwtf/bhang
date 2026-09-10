# TREASURY page — design

Date: 2026-09-10  
Status: approved for local build on branch `treasury-page`  
Site: bhang.wtf

## Purpose

Plant a clear, honest signal for a niche audience (Bitcoin → Ordinals → satnames):

- bhangbuddy tracks BHANG UTXOs
- A vault may one day let holders swap BHANG UTXOs for vault UTXOs (with extra sats)
- Today the vault is unfunded and closed

Tracker remains the live evidence. Treasury is intent + status — not a product UI.

## Tone

Mix of:

- Soft / personal (bhangbuddy’s voice)
- Clear (not funded, not open)
- Mythic / long-game (BHANG sats keep mining on Bitcoin’s clock; longer than one life)

## Approach

**Static sibling page** (same family as About).

- URL: `/treasury`
- File: `treasury/index.html`
- Shared `theme.css` + `theme.js` + favicon
- Footer: Home · About · Tracker · Treasury
- No Tracker JSON, no schedule hooks, no vault address, no swap form in v1

## Layout (top → bottom)

1. **Status board** (first)
   - Vault: `0 BTC`
   - Door: `CLOSED`
   - Tracking: `WATCHING`
2. **Promise** — personal + clear + mythic
3. **How a future swap would work** — 3–4 plain steps, no UI
4. Fixed footer + theme toggle

## Constraints

- Do not change sat tracking maths or `daily-snapshot.sh`
- Do not invent non-zero balance or OPEN door
- Gallery view stays untouched except footer link to Treasury
- Ship on branch first; push to `main` only after local review

## Success

A visitor immediately sees closed/empty/watching, then understands the future swap idea without thinking a live vault exists.
