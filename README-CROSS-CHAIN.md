# Pre-launch Contract Updates v1.1

## Summary

Updated the pre-launch contract to support **cross-chain seat purchasing**, allowing Bitcoin users to buy seats that vest to Stacks addresses.

## Key Changes

### 1. Enhanced `buy-up-to` Function

**Before:**

```clarity
(define-public (buy-up-to (seat-count uint))
```

**After:**

```clarity
(define-public (buy-up-to (seat-count uint) (stx-owner (optional principal)))
```

### 2. New Functionality

- **Payment Source**: Always from `tx-sender` (caller who authorizes transaction)
- **Seat Ownership**: Assigned to `stx-owner` parameter, defaults to `tx-sender` if none provided
- **Backward Compatible**: Existing calls with no second parameter work unchanged

## Cross-Chain Use Case

### Bitcoin → Stacks Bridge Contract

A bridge contract can now:

1. Receive Bitcoin payments from users
2. Call `buy-up-to(seat-count, some(stacks-address))`
3. Pay with sBTC from contract balance
4. Assign seat ownership to user's Stacks address

**Example Flow:**

```
Bitcoin User → Bridge Contract → Pre-launch Contract
     sBTC           sBTC              Seats → Stacks Address
```

## Implementation Details

- Uses `target-owner` helper variable for seat holder tracking
- All existing functions (refund, claim, fee distribution) unchanged
- Maintains security: only `tx-sender` can authorize payments
- Seats owned by `stx-owner` receive all vesting tokens and fee distributions

## Trait Update

Updated `prelaunch-trait` interface to reflect new function signature:

```clarity
(buy-up-to (uint (optional principal)) (response bool uint))
```
