# Pre-Faktory Contract Explanation (Updated)

## Overview

The Pre-Launch Faktory contract is a pre-launch mechanism for ai BTC DAOs on Bitcoin L2. It allows early supporters to participate in the DAO by purchasing "seats" that grant them both token allocation and fee distribution rights.

## Key Mechanics

1. **Seat System**:

   - Total of 20 seats available
   - Each seat costs 0.0002 BTC (20,000 sats)
   - Each seat entitles holder to 2M tokens (assuming 1B total supply)
   - Minimum of 10 unique participants required

2. **Simplified Distribution Process**:

   - Single purchase phase where users can buy up to 7 seats each
   - Dynamic allocation based on remaining seats and users needed
   - Lasts for a fixed period (2100 blocks, about 2 weeks)
   - Distribution automatically initializes when 20 seats are sold AND at least 10 unique users have participated

3. **Vested Token Distribution**:

   - Tokens are vested according to a detailed schedule with multiple releases:
     - Initial release: 10% at start
     - Second phase: 20% across 6 smaller distributions
     - Third phase: 30% across 7 smaller distributions
     - Final phase: 40% across 7 smaller distributions
   - Accelerated vesting can be triggered on successful DEX launch/bonding
     - When activated, immediately unlocks the first 60% of tokens

4. **DAO & Fee Structure**:

   - The DEX opens market and Treasury allows for voting only after pre-launch criteria are met (10+ buyers, 20 seats)
   - Seat holders receive protocol fees from the DEX proportional to seats owned
   - Automatic fee airdrops delivered in sBTC after cooldown periods

5. **Deployment Flow**:
   - Seat purchases until requirements met (20 seats, 10+ users)
   - Automatic token distribution initialization
   - DEX market opens automatically
   - Treasury voting becomes available
   - Ongoing fee airdrops to seat holders

## Transitions and Function Availability

**Purchase Phase:**

- `buy-up-to`: Available until requirements are met (20 seats, 10+ users)
- `refund`: Only available if the contract expires without reaching criteria (20 seats, 10+ users)

**Distribution Phase:**

- Begins automatically when 20 seats are sold to 10+ users
- `claim`: Only available after reaching criteria (20 seats, 10+ users)
- `claim-on-behalf`: Allows claiming tokens for another holder

**Fee Distribution:**

- `trigger-fee-airdrop`: Distributes accumulated fees to all seat holders
- Automatic cooldown period between airdrops (2100 blocks)
- Special "final airdrop mode" activated upon DEX bonding

## Key Variables

- `distribution-height`: Marks successful completion of the purchase phase and initialization of token distribution
- `last-airdrop-height`: Tracks the last time fees were distributed
- `accelerated-vesting`: Enables faster token unlocking (up to 60%) upon bonding
- `final-airdrop-mode`: Allows immediate fee distribution regardless of cooldown

## Workflow

1. Users buy seats during the purchase phase
2. When requirements are met (20 seats, 10+ users), distribution initializes automatically
3. DEX market opens and initial funds are distributed
4. Users can begin claiming tokens according to vesting schedule
5. Periodic fee airdrops are sent to all seat holders

## Fee Airdrops

The fee distribution system uses a streamlined automatic airdrop approach:

- Fees accumulate in a single pool until an airdrop is triggered
- Distribution is proportional to seats owned
- A cooldown period (2100 blocks) between airdrops prevents frequent small distributions
- Anyone can trigger the airdrop once conditions are met
- Upon bonding, a "final airdrop mode" is activated that bypasses the cooldown
- Users automatically receive their fees without any action required

## Security Model

Faktory serves as the deployer agent of the DAO contracts, but critical functionality (DEX market opening and Treasury voting) is conditional on meeting the pre-launch criteria by the community. This ensures that the pre-launch process must be successfully completed with adequate decentralization (10+ unique buyers and 20 seats sold) before the ecosystem becomes fully operational.

The design creates a trustless system where Faktory cannot unilaterally enable key functionalities without first achieving the required level of community participation. This establishes a balance between efficient deployment and decentralized governance from day one.

## Expiration and Refund Mechanism

After 2100 Bitcoin blocks (approximately 2 weeks), if the criteria for launch are not met (10+ unique buyers and 20 seats total), seat buyers can request refunds by calling the `refund` function.

Important notes about this mechanism:

- The ability to get refunds doesn't prevent the criteria from being met later
- New buyers can still purchase seats even after the expiration period
- If the criteria are eventually met (even after expiration), the distribution will initialize automatically
- Refunds are only available if the distribution hasn't been initialized yet

This approach provides protection for early supporters while maintaining flexibility for the pre-launch process to succeed even after the initial timeframe.
