# Pre-Faktory Contract Explanation

## Overview

The Pre-Faktory contract is a pre-launch mechanism for the Faktory.fun DEX on Bitcoin L2. It allows early supporters to participate in the DAO by purchasing "seats" that grant them both token allocation and fee distribution rights.

## Key Mechanics

1. **Seat System**:

   - Total of 20 seats available
   - Each seat costs 0.0002 BTC (20,000 sats)
   - Each seat entitles holder to 2M tokens (assuming 1B total supply)
   - Minimum of 10 unique participants required

2. **Two-Phase Distribution**:

   - **Period 1**: Initial seat purchase phase
     - Users can buy up to 7 seats each
     - Dynamic allocation based on remaining seats and users needed
     - Lasts for a fixed period (2100 blocks, about 2 weeks)
   - **Period 2**: Redistribution phase
     - Triggered when 20 seats are sold AND at least 10 unique users have participated
     - New users can buy a single seat from the largest seat holder
     - Promotes fairer distribution and more community participation
     - Lasts for 100 blocks

3. **Vested Token Distribution**:

   - Tokens are vested according to a schedule:
     - 10% at start
     - 20% after 1000 blocks
     - 30% after 2100 blocks
     - 40% after 4200 blocks
   - Accelerated vesting can be triggered on successful DEX launch/bonding

4. **DAO & Fee Structure**:

   - Seat holders become owners of the DAO's multi-sig
   - The multi-sig is the deployer of the DAO contracts
   - Seat holders receive protocol fees from the DEX proportional to seats owned
   - Automatic fee airdrops delivered in sBTC after cooldown periods

5. **Deployment Flow**:
   - Period 1: Seat purchases
   - Period 2: Optional redistribution
   - Multi-sig creation with all participants
   - Token deployment and initial distribution
   - DEX contract deployment with collected funds
   - Ongoing fee airdrops to seat holders

This pre-launch structure creates a decentralized foundation for the DEX by distributing both governance power and economic benefits to early supporters while ensuring a minimum level of decentralization from day one.

## Transitions and Function Availability

**Period 1:**

- `buy-up-to`: Available until Period 2 starts
- `refund`: Only available if Period 1 expires without reaching criteria and Period 2 hasn't started

**Period 2:**

- Begins automatically when 20 seats are sold to 10+ users
- `buy-single-seat`: Only available during Period 2 (100 blocks)
- `set-contract-addresses`: Only available after Period 2 starts

**Token Distribution:**

- `initialize-token-distribution`: Can only be called by the DAO token after Period 2 starts and set-contract-addresses is set properly
- `claim`: Only available after token distribution is initialized

## Key Variables

- `period-2-height`: Marks successful completion of Period 1
- `token-contract`: Marks DAO token deployment and initialization (not redundant)

## Workflow

1. Users buy seats in Period 1
2. Period 2 starts automatically when requirements met
3. Multi-sig agent sets contract addresses during Period 2
4. DAO token deploys and initializes distribution (which can only happen once)
5. Users can begin claiming tokens according to vesting schedule

Each check serves a distinct purpose in ensuring correct sequencing and authorization throughout the process. The token-contract variable is indeed not redundant - it specifically marks when the DAO token has deployed and initialized distribution, which is separate from the Period 2 transition.

## Multi-sig Security Model

At no point does the multi-sig agent control the flow of money or token distribution. The agent only facilitates the creation of the multi-sig and setting of contracts. If an error occurs in setting addresses, the agent can create a new multi-sig with the correct configuration and update the addresses accordingly without risking funds.

The design ensures transparency as anyone can verify that the multi-sig members match the first buyers from Period 1. This establishes decentralized control from day one while maintaining the technical capability to deploy the necessary infrastructure.

Recovery Path: If the token is deployed with an address that doesn't match what's set in the pre-launch contract, initialize-distribution will fail. The agent can then create a new multi-sig, update the contract addresses, and redeploy the token correctly. This ensures STX funds in the pre-launch contract are never stuck, even if deployment errors occur.

If the multi-sig creator makes a mistake in setting addresses:

1. They can deploy a new multi-sig with the correct configuration
2. Call `set-contract-addresses` again with the correct addresses
3. Deploy the token contract through the new multi-sig
4. The token contract calls `initialize-token-distribution`

Since the condition is `(asserts! (is-eq tx-sender (var-get dao-token)) ERR-NOT-AUTHORIZED)`, as long as the caller matches whatever is currently set as `dao-token`, the initialization will succeed.

This approach gives flexibility to fix mistakes without complex recovery mechanisms, while still maintaining the security of requiring the multi-sig for deployment. The only consequence is that the first incorrect multi-sig would need to be abandoned, but that's a reasonable tradeoff for the simplicity it provides.

;; Pre-launch participants are considered co-deployers of the DAO contract infrastructure through
;; the multi-sig and thus have legitimate claim to protocol fees based on:
;;
;; 1. They provide valuable service in protocol deployment and bootstrapping
;; 2. Fee distribution is transparent, immutable and programmatically defined
;; 3. Multi-sig creation formalizes their relationship with the DAO
;;
;; Fee compensation is separate from token purchase:
;; - Participants buy tokens through seat purchase
;; - Participants receive fees as compensation for their deployer role
;; - These are distinct forms of value with different legal bases
;;
;; Implementation follows standard DeFi practices:
;;
;; This creates proper incentive alignment and encourages long-term protocol engagement
;; beyond the initial vesting period.

## Fee Airdrops

We simplified the fee distribution system by replacing a complex period-based claiming mechanism with a streamlined automatic airdrop approach. Instead of tracking fees per period and requiring each user to manually claim their share, the new system accumulates all fees in a single pool and distributes them proportionally to all seat holders in one transaction. We optimized the code by directly using the existing seat-holders list, implemented a cooldown period between airdrops, and added a special "final airdrop" mode on bonding. The new system is more gas-efficient and provides a much better user experience since users automatically receive their fees without any action required.
