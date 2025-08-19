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

# ============================================

============================================

I'll explain how the cross-chain seat purchase tests work. These tests are testing a key feature where one person can pay for seats but another person owns them - this is useful for cross-chain scenarios where someone might pay with Bitcoin but want the seats to go to their Stacks address.

## Test 1: "should allow buying seats on behalf of another user - payer vs owner separation"

**What it does:**

```typescript
// address1 pays for seats but address2 owns them
const { result, events } = buySeatOnBehalf(address1, address2, 3);
```

**Function called:** `buySeatOnBehalf()` helper function, which internally calls:

```typescript
simnet.callPublicFn(
  "name-pre-faktory",
  "buy-up-to",
  [uintCV(3), someCV(principalCV(address2))], // Third parameter specifies the owner
  address1 // This is the payer
);
```

**What it verifies:**

- Payment comes from address1 (the payer)
- Seats are owned by address2 (the beneficiary)
- address1 has no seats in their name
- address2 has 3 seats
- Only address2 is counted as a "user" in the system

---

## Test 2: "should allow seat owner (not payer) to claim tokens"

**What it does:**
Sets up a scenario where address1 pays for 5 seats owned by address2, then fills up to exactly 20 seats/10 users to trigger distribution.

**Functions called:**

1. `buySeatOnBehalf(address1, address2, 5)` - Setup the cross-chain purchase
2. Multiple `buy-up-to` calls to reach 20 seats/10 users
3. `simnet.mineEmptyBurnBlocks(250)` - Move to vesting period
4. `claim` function calls:

   ```typescript
   // This should FAIL
   simnet.callPublicFn("name-pre-faktory", "claim", [token], address1);

   // This should SUCCEED
   simnet.callPublicFn("name-pre-faktory", "claim", [token], address2);
   ```

**What it verifies:**

- address1 (payer) CANNOT claim tokens (gets error 302 - not a seat owner)
- address2 (seat owner) CAN claim tokens
- Tokens go to address2, not address1
- Claimable amount is calculated correctly based on 5 seats and vesting schedule

---

## Test 3: "should handle fee distribution to seat owners, not payers"

**What it does:**
Sets up multiple cross-chain purchases, triggers distribution, opens the DEX market, generates trading fees, then distributes those fees.

**Functions called:**

1. `buySeatOnBehalf(address1, address3, 2)` - address1 pays, address3 owns
2. `buySeatOnBehalf(address2, address4, 3)` - address2 pays, address4 owns
3. Fill to 20 seats/10 users to trigger distribution
4. `open-market` - Open the DEX
5. `buy` on DEX - Generate trading fees
6. `trigger-fee-airdrop` - Distribute accumulated fees

**What it verifies:**

- Fee transfers go to seat owners (address3, address4)
- Fee transfers do NOT go to payers (address1, address2)
- The fee distribution respects seat ownership, not who paid

---

## Test 4: "should handle refunds correctly - refund goes to seat owner, not payer"

**What it does:**
Tests the refund mechanism in a cross-chain scenario.

**Functions called:**

1. Setup: `buy-up-to` with owner parameter:

   ```typescript
   simnet.callPublicFn(
     "name-pre-faktory",
     "buy-up-to",
     [uintCV(2), someCV(principalCV(address2))], // address2 owns
     address1 // address1 pays
   );
   ```

2. Refund attempts:

   ```typescript
   // This should FAIL
   simnet.callPublicFn("name-pre-faktory", "refund", [], address1);

   // This should SUCCEED
   simnet.callPublicFn("name-pre-faktory", "refund", [], address2);
   ```

**What it verifies:**

- address1 (payer) CANNOT get a refund (error 302 - not a seat owner)
- address2 (seat owner) CAN get a refund
- Refund money goes to address2 (seat owner), not address1 (payer)
- Seats are properly removed from address2's ownership

## Key Smart Contract Function: `buy-up-to`

The core function being tested has this signature:

```clarity
(define-public (buy-up-to (seat-count uint) (owner (optional principal)))
```

- **seat-count**: How many seats to buy
- **owner**: Optional parameter specifying who should own the seats
  - If `none`: tx-sender owns the seats
  - If `(some principal)`: that principal owns the seats, but tx-sender pays

## Why This Matters

This functionality enables:

1. **Cross-chain payments**: Pay with Bitcoin, own with Stacks address
2. **Gifting**: Buy seats for someone else
3. **Corporate purchases**: Company pays, employee owns
4. **Delegation**: Service pays on behalf of users

The tests ensure that throughout the entire lifecycle (purchase → claiming → fee distribution → refunds), the system correctly distinguishes between who paid and who owns the seats.
