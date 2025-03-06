;; 31e7dcf1490cdc5660986afa318b463f15983585fcbd009cae3f0ebad58c349b
;; aibtc.com DAO faktory.fun PRE @version 1.0
;; Pre-launch contract for token distribution
;; Dynamic allocation: 1-7 seats per user in Period 1
;; Each seat = 0.00020000 BTC, targeting 20 seats total with minimum 10 users

;; Pre-launch participants are co-deployers of the DAO contract infrastructure through 
;; a multi-sig and thus have legitimate claim to protocol fees generated by the DEX contract.
;; Fee airdrops are separate from token purchase and vesting.

(use-trait faktory-token .faktory-trait-v1.sip-010-trait) ;; STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A

(define-constant SEATS u20)
(define-constant MIN-USERS u10)
(define-constant MAX-SEATS-PER-USER u7)
(define-constant PRICE-PER-SEAT u20000) ;; 20K sats per seat
(define-constant TOKENS-PER-SEAT u200000000000000) ;; 2M tokens per seat if supply 1B with 8 decimals
(define-constant EXPIRATION-PERIOD u2100) ;; 1 Stacks reward cycle in PoX-4
(define-constant PERIOD-2-LENGTH u100) ;; blocks for redistribution period
(define-constant DEX-AMOUNT u250000)
(define-constant MULTI-SIG-AMOUNT u10000)
(define-constant FEE-AMOUNT u140000)

(define-constant FT-INITIALIZED-BALANCE u4000000000000000) ;; 40M tokens for pre-launch if supply 1B
(define-constant ACCELERATED-PERCENT u60) 

;; Vesting schedule (percentages add up to 100)
(define-constant VESTING-SCHEDULE
    (list 
        ;; Initial release - 10% at once
        {height: u100, percent: u10, id: u0}    ;; 10% at initial unlock
        
        ;; Second phase - 20% total across 6 drips
        {height: u250, percent: u3, id: u1}     ;; 3%
        {height: u400, percent: u3, id: u2}     ;; 3%
        {height: u550, percent: u3, id: u3}     ;; 3%
        {height: u700, percent: u3, id: u4}     ;; 3%
        {height: u850, percent: u4, id: u5}     ;; 4%
        {height: u1000, percent: u4, id: u6}    ;; 4% - hitting 30% total at original second milestone
        
        ;; Third phase - 30% total across 7 drips
        {height: u1200, percent: u4, id: u7}    ;; 4%
        {height: u1400, percent: u4, id: u8}    ;; 4%
        {height: u1600, percent: u4, id: u9}    ;; 4%
        {height: u1750, percent: u4, id: u10}   ;; 4%
        {height: u1900, percent: u4, id: u11}   ;; 4%
        {height: u2000, percent: u5, id: u12}   ;; 5%
        {height: u2100, percent: u5, id: u13}   ;; 5% - hitting 60% total at original third milestone
        
        ;; Final phase - 40% total across 7 drips
        {height: u2500, percent: u5, id: u14}   ;; 5%
        {height: u2900, percent: u5, id: u15}   ;; 5%
        {height: u3300, percent: u6, id: u16}   ;; 6%
        {height: u3600, percent: u6, id: u17}   ;; 6%
        {height: u3900, percent: u6, id: u18}   ;; 6%
        {height: u4100, percent: u6, id: u19}   ;; 6%
        {height: u4200, percent: u6, id: u20})) ;; 6% - hitting 100% total at original final milestone

(define-constant MULTI-SIG-CREATOR tx-sender) ;; if a multi-sig can create a multi-sig then this is a multi-sig 2 of 5

;; Data vars
(define-data-var ft-balance uint u0)
(define-data-var stx-balance uint u0)
(define-data-var total-seats-taken uint u0)
(define-data-var total-users uint u0)
(define-data-var token-contract (optional principal) none)
(define-data-var distribution-height (optional uint) none)
(define-data-var deployment-height uint burn-block-height)
(define-data-var period-2-height uint u0)
(define-data-var accelerated-vesting bool false)

;; Determined after multi-sig creation
(define-data-var dao-token (optional principal) none) ;; 'STRZ4P1ABSVSZPC4HZ4GDAW834HHEHJMF65X5S6D.txt6-faktory)
(define-data-var dex-contract (optional principal) none) ;; 'STRZ4P1ABSVSZPC4HZ4GDAW834HHEHJMF65X5S6D.txt6-faktory-dex)
(define-data-var dao-multi-sig (optional principal) none) ;; 'ST3SPSJDYGHF0ARGV1TNS0HX6JEP7T1J6849A7BB4)
;; Helper vars
(define-data-var target-owner principal 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A) ;; cant-be-evil.stx  in testnet? random 'SP000000000000000000002Q6VF78

;; Define a data variable to track seat holders
(define-data-var seat-holders (list 20 {owner: principal, seats: uint}) (list))

;; Track seat ownership and claims
(define-map seats-owned principal uint)
(define-map claimed-amounts principal uint)

;; Error constants
(define-constant ERR-TOO-MANY-SEATS (err u300))
(define-constant ERR-NO-SEATS-LEFT (err u301))
(define-constant ERR-NOT-SEAT-OWNER (err u302))
(define-constant ERR-NOT-SET (err u303))
(define-constant ERR-NOTHING-TO-CLAIM (err u304))
(define-constant ERR-NOT-AUTHORIZED (err u305))
(define-constant ERR-ALREADY-INITIALIZED (err u306))
(define-constant ERR-WRONG-TOKEN (err u307))
(define-constant ERR-ALREADY-EXPIRED (err u308))
(define-constant ERR-NOT-EXPIRED (err u309))
(define-constant ERR-NO-REFUND (err u310))
(define-constant ERR-CONTRACT-INSUFFICIENT-FUNDS (err u311))
(define-constant ERR-PERIOD-2-MULTIPLE-SEATS (err u312))
(define-constant ERR-INVALID-SEAT-COUNT (err u313))
(define-constant ERR-SLICE-FAILED (err u314))
(define-constant ERR-TOO-LONG (err u315))
(define-constant ERR-REMOVING-HOLDER (err u316))
(define-constant ERR-HIGHEST-ONE-SEAT (err u317))
(define-constant ERR-NOT-BONDED (err u318))
(define-constant ERR-PERIOD-2-NOT-INITIALIZED (err u319))
(define-constant ERR-PERIOD-2-ALREADY-STARTED (err u320))
(define-constant ERR-DISTRIBUTION-NOT-INITIALIZED (err u321))
(define-constant ERR-HIGHEST-HOLDER (err u322))


;; Helper functions for period management
(define-private (is-period-1-expired)
    (> burn-block-height (+ (var-get deployment-height) EXPIRATION-PERIOD)))

(define-private (is-in-period-2)
     (<= burn-block-height (+ (var-get period-2-height) PERIOD-2-LENGTH)))

;; Helper function to update seat holders list
(define-private (update-seat-holder (owner principal) (seat-count uint))
  (let ((current-holders (var-get seat-holders))
        (updated-list (update-or-add-holder current-holders owner seat-count)))
    (var-set seat-holders updated-list)))

;; Helper to update or add a holder to the list
(define-private (update-or-add-holder 
    (holders (list 20 {owner: principal, seats: uint}))
    (owner principal) (seat-count uint))
  (let ((position (find-holder-position holders)))
    (if (is-some position)
        ;; Update existing holder - unwrap the optional result
        (unwrap-panic (replace-at? holders (unwrap-panic position) {owner: owner, seats: seat-count}))
        ;; Add new holder
        (unwrap-panic (as-max-len? (append holders {owner: owner, seats: seat-count}) u20)))))

;; Helper to find a holder's position in the list
(define-private (find-holder-position 
    (holders (list 20 {owner: principal, seats: uint})))
  (let ((result (fold check-if-owner 
                     holders 
                     {found: false, index: u0})))
    (if (get found result)
        (some (get index result))
        none)))

(define-private (check-if-owner 
    (entry {owner: principal, seats: uint}) 
    (state {found: bool, index: uint}))
  (if (get found state)
      ;; Already found, just pass through
      state
      ;; Check if this is the owner we're looking for
      (if (is-eq (get owner entry) (var-get target-owner))
          ;; Found it, update state
          {found: true, index: (get index state)}
          ;; Not found, increment counter
          {found: false, index: (+ (get index state) u1)})))

(define-private (remove-seat-holder)
  (let ((position (find-holder-position (var-get seat-holders)))
        (current-list (var-get seat-holders)))
    (match position 
        pos (let ((before-slice (unwrap! (slice? current-list u0 pos) ERR-SLICE-FAILED))
                  (after-slice (unwrap! (slice? current-list (+ pos u1) (len current-list)) ERR-SLICE-FAILED))
                  (updated-list (unwrap! (as-max-len? (concat before-slice after-slice) u20) ERR-TOO-LONG)))
              (var-set seat-holders updated-list)
              (ok true))
        (ok false))))  ;; If position not found, do nothing

;; Main functions
;; Buy seats in Period 1
(define-public (buy-up-to (seat-count uint))
    (let (
        (current-seats (var-get total-seats-taken))
        (user-seats (default-to u0 (map-get? seats-owned tx-sender)))
        (max-total-allowed (get-max-seats-allowed))
        (max-additional-allowed (if (>= user-seats max-total-allowed)
                                  u0
                                  (- max-total-allowed user-seats)))
        (actual-seats (if (> seat-count max-additional-allowed) 
                        max-additional-allowed
                        seat-count)))
        
        (asserts! (> actual-seats u0) ERR-INVALID-SEAT-COUNT)
        (asserts! (< current-seats SEATS) ERR-NO-SEATS-LEFT)
        (asserts! (is-eq (var-get period-2-height) u0) ERR-PERIOD-2-ALREADY-STARTED)
        
        ;; Process payment
        (match (contract-call? .sbtc-token 
                    transfer (* PRICE-PER-SEAT actual-seats) tx-sender (as-contract tx-sender) none)
            success 
                (begin
                    (if (is-eq user-seats u0) 
                        (var-set total-users (+ (var-get total-users) u1))
                        true)
                    (map-set seats-owned tx-sender (+ user-seats actual-seats))
                    (var-set total-seats-taken (+ current-seats actual-seats))
                    (var-set stx-balance (+ (var-get stx-balance) (* PRICE-PER-SEAT actual-seats)))
                    (var-set target-owner tx-sender)
                    (update-seat-holder tx-sender (+ user-seats actual-seats))
                    
                    (if (and (>= (var-get total-users) MIN-USERS)  ;; Check if we should start Period 2
                            (>= (var-get total-seats-taken) SEATS))
                        (var-set period-2-height burn-block-height)
                        true)
                    (print {
                        type: "buy-seats",
                        buyer: tx-sender,
                        seats-owned: (+ user-seats actual-seats),
                        total-users: (var-get total-users),
                        total-seats-taken: (+ current-seats actual-seats),
                        stx-balance: (var-get stx-balance),
                        seat-holders: (var-get seat-holders),
                        period-2-height: (var-get period-2-height) ;; perhaps these var-get can be optimized?
                        })
                    (ok true))
            error (err error))))

;; Get highest seat holder for Period 2 reductions
(define-private (get-highest-seat-holder)
    (let ((holders (var-get seat-holders)))
      (if (> (len holders) u0)
          (let ((first-holder (unwrap-panic (element-at holders u0))))
            (some (get owner (fold check-highest holders first-holder))))
          none)))

(define-private (check-highest 
    (entry {owner: principal, seats: uint}) 
    (current-max {owner: principal, seats: uint}))
  (if (>= (get seats entry) (get seats current-max))
      entry
      current-max))

;; Buy exactly one seat in Period 2
(define-public (buy-single-seat)
    (let (
        (current-seats (var-get total-seats-taken))
        (highest-holder (get-highest-seat-holder))
        (holder (unwrap! highest-holder ERR-HIGHEST-HOLDER))
        (old-seats (default-to u0 (map-get? seats-owned holder))))
        
        (asserts! (> (var-get period-2-height) u0) ERR-PERIOD-2-NOT-INITIALIZED)
        (asserts! (is-in-period-2) ERR-ALREADY-EXPIRED)
        (asserts! (< (var-get total-users) SEATS) ERR-NO-SEATS-LEFT)
        (asserts! (> old-seats u1) ERR-HIGHEST-ONE-SEAT)
        
        ;; Process payment and refund highest holder
        (match (contract-call? .sbtc-token 
                    transfer PRICE-PER-SEAT tx-sender holder none)
            success 
                (begin
                    ;; Update new buyer
                    (var-set total-users (+ (var-get total-users) u1))
                    (map-set seats-owned holder (- old-seats u1))
                    (map-set seats-owned tx-sender u1)
                    (var-set target-owner holder)
                    (update-seat-holder holder (- old-seats u1))  ;; Update list for holder
                    (var-set target-owner tx-sender)
                    (update-seat-holder tx-sender u1)             ;; Update list for buyer
                    (print {
                        type: "buy-single-seat",
                        total-users: (var-get total-users),
                        holder: holder,
                        holder-seats: (- old-seats u1),
                        buyer: tx-sender,
                        buyer-seats: u1,
                        seat-holders: (var-get seat-holders),
                         })
                    (ok true))
            error (err error))))

;; Refund logic only for Period 1 expired and Period 2 not started
(define-public (refund)
    (let (
        (user-seats (default-to u0 (map-get? seats-owned tx-sender)))
        (seat-owner tx-sender))
        (asserts! (is-period-1-expired) ERR-NOT-EXPIRED) ;; period 1 is expired
        (asserts! (is-eq (var-get period-2-height) u0) ERR-PERIOD-2-ALREADY-STARTED)
        (asserts! (> user-seats u0) ERR-NOT-SEAT-OWNER)
        
        (var-set target-owner tx-sender)
        ;; Process refund
        ;; 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2
        (match (as-contract (contract-call? .sbtc-token 
                            transfer (* PRICE-PER-SEAT user-seats) tx-sender seat-owner none))
            success 
                (let ((is-removed (unwrap! (remove-seat-holder) ERR-REMOVING-HOLDER)))
                    (map-delete seats-owned tx-sender)
                    (var-set total-seats-taken (- (var-get total-seats-taken) user-seats))
                    (var-set total-users (- (var-get total-users) u1))
                    (var-set stx-balance (- (var-get stx-balance) (* PRICE-PER-SEAT user-seats)))
                    (print {
                        type: "refund",
                        user: tx-sender,
                        seat-holders: (var-get seat-holders),
                        total-seats-taken: (var-get total-seats-taken),
                        total-users: (var-get total-users),
                        stx-balance: (var-get stx-balance)
                        })
                    (ok true))
            error (err error))))

;; Calculate claimable amount based on vesting schedule
(define-private (get-claimable-amount (owner principal))
    (match (var-get distribution-height) 
        start-height 
            (let ((claimed (default-to u0 (map-get? claimed-amounts owner)))
                  (seats-owner (default-to u0 (map-get? seats-owned owner)))
                  (vested (fold check-claimable VESTING-SCHEDULE u0)))
                (- (* vested seats-owner) claimed)) ;; double claiming is impossible    
        u0)) ;; If distribution not initialized, nothing is claimable

(define-private (check-claimable (entry {height: uint, percent: uint, id: uint}) (current-total uint))
    (if (<= (+ (unwrap-panic (var-get distribution-height)) (get height entry)) burn-block-height)
        (+ current-total (/ (* TOKENS-PER-SEAT (get percent entry)) u100))
        (if (and 
            (var-get accelerated-vesting)   ;; token graduated, accelerated vesting
            (<= (get id entry) u2))  ;; we're in first 3 entries (0,1,2)
            (+ current-total (/ (* TOKENS-PER-SEAT (get percent entry)) u100))
            current-total)))

;; Claim vested tokens
(define-public (claim (ft <faktory-token>))
    (let ((claimable (get-claimable-amount tx-sender))
          (seat-owner tx-sender))
        (asserts! (is-eq (var-get token-contract) (var-get dao-token)) ERR-DISTRIBUTION-NOT-INITIALIZED) 
        (asserts! (is-eq (contract-of ft) (unwrap-panic (var-get dao-token))) ERR-WRONG-TOKEN)
        (asserts! (> (default-to u0 (map-get? seats-owned tx-sender)) u0) ERR-NOT-SEAT-OWNER)
        (asserts! (> claimable u0) ERR-NOTHING-TO-CLAIM)
        (asserts! (>= (var-get ft-balance) claimable) ERR-CONTRACT-INSUFFICIENT-FUNDS)
        (match (as-contract (contract-call? ft transfer claimable tx-sender seat-owner none))
            success
                (begin
                    (map-set claimed-amounts tx-sender 
                        (+ (default-to u0 (map-get? claimed-amounts tx-sender)) claimable))
                    (var-set ft-balance (- (var-get ft-balance) claimable)) ;; reduce ft-balance by claimable
                    (print {
                        type: "claim",
                        user: tx-sender,
                        amount-claimed: claimable,
                        total-claimed: (map-get? claimed-amounts tx-sender),
                        ft-balance: (var-get ft-balance)
                        })
                    (ok claimable))
            error (err error))))

;; Claim vested tokens on behalf of a specific holder
(define-public (claim-on-behalf (ft <faktory-token>) (holder principal))
    (let ((claimable (get-claimable-amount holder)))
        (asserts! (is-eq (var-get token-contract) (var-get dao-token)) ERR-DISTRIBUTION-NOT-INITIALIZED) 
        (asserts! (is-eq (contract-of ft) (unwrap-panic (var-get dao-token))) ERR-WRONG-TOKEN)
        (asserts! (> (default-to u0 (map-get? seats-owned holder)) u0) ERR-NOT-SEAT-OWNER)
        (asserts! (> claimable u0) ERR-NOTHING-TO-CLAIM)
        (asserts! (>= (var-get ft-balance) claimable) ERR-CONTRACT-INSUFFICIENT-FUNDS) 
        (match (as-contract (contract-call? ft transfer claimable tx-sender holder none))
            success
                (begin
                    (map-set claimed-amounts holder 
                        (+ (default-to u0 (map-get? claimed-amounts holder)) claimable))
                    (var-set ft-balance (- (var-get ft-balance) claimable))
                    (print {
                        type: "claim",
                        user: holder,
                        amount-claimed: claimable,
                        total-claimed: (map-get? claimed-amounts holder),
                        ft-balance: (var-get ft-balance)
                    })
                    (ok claimable))
            error (err error))))

;; Read only functions
(define-read-only (get-max-seats-allowed)
    (let (
        (seats-remaining (- SEATS (var-get total-seats-taken)))    ;; 13 seats left
        (users-remaining (- MIN-USERS (var-get total-users)))      ;; 9 users needed
        (max-possible (+ (- seats-remaining users-remaining) u1))) ;; (13 - 9) + 1 = 5 seats possible
        (if (>= max-possible MAX-SEATS-PER-USER)
            MAX-SEATS-PER-USER
            max-possible)))

(define-read-only (get-contract-status)
    (ok 
    {
        is-period-1-expired: (is-period-1-expired),
        period-2-started: (> (var-get period-2-height) u0),
        is-in-period-2: (is-in-period-2),
        total-users: (var-get total-users),
        total-seats-taken: (var-get total-seats-taken),
        distribution-initialized: (is-some (var-get token-contract))
    }))

(define-read-only (get-user-info (user principal))
    (ok
    {
        seats-owned: (default-to u0 (map-get? seats-owned user)),
        amount-claimed: (default-to u0 (map-get? claimed-amounts user)),
        claimable-amount: (get-claimable-amount user)
    }))

(define-read-only (get-period-2-info)
    (ok
    {
        highest-holder: (get-highest-seat-holder),
        period-2-blocks-remaining: (if (<= burn-block-height (+ (var-get period-2-height) PERIOD-2-LENGTH))
            (- burn-block-height (+ (var-get period-2-height) PERIOD-2-LENGTH))
            u0)
    }))

(define-read-only (get-remaining-seats)
    (ok {remainin-seats: (- SEATS (var-get total-seats-taken))}))

(define-read-only (get-seats-owned (address principal))
    (ok {seats-owned:
    (> (default-to u0 (map-get? seats-owned address)) u0)}))

(define-read-only (get-claimed-amount (address principal))
    (ok {claimed-amount:
    (default-to u0 (map-get? claimed-amounts address))}))

(define-read-only (get-vesting-schedule)
    (ok {vesting-schedule: VESTING-SCHEDULE}))

(define-read-only (get-seat-holders)
    (ok {seat-holders: (var-get seat-holders)}))

;; A multi-sig creator contract addresses after creating a multi-sig whose owners are 10 buyers resulting from period 1
(define-public (set-contract-addresses (new-multi-sig principal) (new-dao-token principal) (new-dex-contract principal))
    (begin
        (asserts! (> (var-get period-2-height) u0) ERR-PERIOD-2-NOT-INITIALIZED)
        (asserts! (is-eq tx-sender MULTI-SIG-CREATOR) ERR-NOT-AUTHORIZED)

        (var-set dao-multi-sig (some new-multi-sig))
        (var-set dao-token (some new-dao-token))
        (var-set dex-contract (some new-dex-contract))
        
        (print {
            type: "contract-addresses-updated",
            dao-multi-sig: new-multi-sig,
            dao-token: new-dao-token,
            dex-contract: new-dex-contract,
            multi-sig-creator: MULTI-SIG-CREATOR
        })
        (ok true)))

;; on DAO token deployment
(define-public (initialize-token-distribution)
    (begin
        (asserts! (> (var-get period-2-height) u0) ERR-PERIOD-2-NOT-INITIALIZED)
        (asserts! (is-eq (some tx-sender) (var-get dao-token)) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (var-get token-contract)) ERR-ALREADY-INITIALIZED)
        (asserts! (is-some (var-get dao-multi-sig)) ERR-NOT-SET)
        (asserts! (is-some (var-get dao-token)) ERR-NOT-SET)
        (asserts! (is-some (var-get dex-contract)) ERR-NOT-SET)
        (try! (as-contract (contract-call? .sbtc-token 
                             transfer DEX-AMOUNT tx-sender (unwrap-panic (var-get dex-contract)) none))) ;; 0.00250000 BTC to DEX  
        (try! (as-contract (contract-call? .sbtc-token 
                             transfer MULTI-SIG-AMOUNT tx-sender (unwrap-panic  (var-get dao-multi-sig)) none))) ;; 0.00010000 BTC to multi-sig/admin -> covers contract deployment fees
        (try! (as-contract (contract-call? .sbtc-token 
                             transfer FEE-AMOUNT tx-sender MULTI-SIG-CREATOR none)))  ;; 0.00140000 BTC fees -> covers ordinals bot, pontis and faktory
        (var-set token-contract (some tx-sender))
        (var-set distribution-height (some burn-block-height))
        (var-set last-airdrop-height (some burn-block-height))
        (var-set ft-balance FT-INITIALIZED-BALANCE) ;; 20M tokens
        (print {
            type: "distribution-initialized",
            token-contract: (var-get dao-token),
            distribution-height: burn-block-height,
            ft-balance: FT-INITIALIZED-BALANCE
        })
        (ok true)))

(define-public (initialize-token-distribution-demo)
    (begin
        ;; (asserts! (> (var-get period-2-height) u0) ERR-PERIOD-2-NOT-INITIALIZED)
        ;; (asserts! (is-eq (some tx-sender) (var-get dao-token)) ERR-NOT-AUTHORIZED)
        ;; (asserts! (is-none (var-get token-contract)) ERR-ALREADY-INITIALIZED)
        ;; (asserts! (is-some (var-get dao-multi-sig)) ERR-NOT-SET)
        ;; (asserts! (is-some (var-get dao-token)) ERR-NOT-SET)
        ;; (asserts! (is-some (var-get dex-contract)) ERR-NOT-SET)
        ;; (try! (as-contract (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token 
        ;;                      transfer u250000 tx-sender (unwrap-panic (var-get dex-contract)) none))) ;; 0.00250000 BTC to DEX  
        ;; (try! (as-contract (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token 
        ;;                      transfer u10000 tx-sender (unwrap-panic  (var-get dao-multi-sig)) none))) ;; 0.00010000 BTC to multi-sig/admin -> covers contract deployment fees
        ;; (try! (as-contract (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token 
        ;;                      transfer u140000 tx-sender MULTI-SIG-CREATOR none)))  ;; 0.00140000 BTC fees -> covers ordinals bot, pontis and faktory
        (var-set token-contract (some tx-sender))
        (var-set distribution-height (some burn-block-height))
        (var-set last-airdrop-height (some burn-block-height))
        (var-set ft-balance FT-INITIALIZED-BALANCE) ;; 40M tokens
        (print {
            type: "distribution-initialized",
            token-contract: contract-caller,
            distribution-height: burn-block-height,
            ft-balance: FT-INITIALIZED-BALANCE
        })
        (ok true)))

;;; on Bonding
(define-public (toggle-bonded)
    (begin
        (asserts! (is-eq contract-caller (unwrap! (var-get dex-contract) ERR-NOT-SET)) ERR-NOT-AUTHORIZED)
        (var-set accelerated-vesting true) 
        (var-set final-airdrop-mode true) 
        (ok true)))

;; Simplified Fee Distribution System
;; Constants
(define-constant COOLDOWN-PERIOD u2100) ;; Longer cooldown between airdrops

;; Error constants
(define-constant ERR-NO-FEES-TO-DISTRIBUTE (err u323))
(define-constant ERR-COOLDOWN-ACTIVE (err u324))
(define-constant ERR-TOTAL-SEATS-ZERO (err u325))

;; Data vars for fee tracking
(define-data-var accumulated-fees uint u0)        ;; Total fees accumulated since last airdrop
(define-data-var last-airdrop-height (optional uint) (some u0)) ;; Block height of the last airdrop
(define-data-var final-airdrop-mode bool false)   ;; Toggle for final airdrop mode

;; Add this function to allow the DEX to send fees to the contract
(define-public (create-fees-receipt (amount uint))
    (let ((current-fees (var-get accumulated-fees)))
        ;; Only the DEX contract can call this function
        (asserts! (is-eq contract-caller (unwrap! (var-get dex-contract) ERR-NOT-SET)) ERR-NOT-AUTHORIZED)
        
        ;; Update accumulated fees
        (var-set accumulated-fees (+ current-fees amount))
        
        (print {
            type: "fees-received",
            amount: amount,
            total-accumulated: (+ current-fees amount)
        })
        (ok true)))

;; Check if airdrop can be triggered
(define-read-only (can-trigger-airdrop)
    (let ((cooldown-expired (>= burn-block-height (+ (unwrap-panic (var-get last-airdrop-height)) COOLDOWN-PERIOD)))
          (has-fees (> (var-get accumulated-fees) u0))
          (final-mode (var-get final-airdrop-mode)))
        
        (or (and cooldown-expired has-fees)    
            (and final-mode has-fees))))      

;; Main airdrop function - anyone can call
(define-public (trigger-fee-airdrop)
    (let ((total-fees (var-get accumulated-fees))
          (total-seats (var-get total-seats-taken))
          (can-airdrop (can-trigger-airdrop)))
        
        ;; Check if airdrop can be triggered
        (asserts! can-airdrop (if (> total-fees u0) 
                                 ERR-COOLDOWN-ACTIVE 
                                 ERR-NO-FEES-TO-DISTRIBUTE))
        
        ;; Must have fees to distribute and seats must exist
        (asserts! (> total-fees u0) ERR-NO-FEES-TO-DISTRIBUTE)
        (asserts! (> total-seats u0) ERR-TOTAL-SEATS-ZERO)
        
        ;; Distribute fees to all seat holders
        (map distribute-to-holder (var-get seat-holders))
        
        ;; Reset accumulated fees and update last airdrop height
        (var-set accumulated-fees u0)
        (var-set last-airdrop-height (some burn-block-height))
        
        (print {
            type: "fee-airdrop",
            total-distributed: total-fees,
            timestamp: burn-block-height
        })
        (ok total-fees)))

;; Helper function to distribute fees to a single holder
(define-private (distribute-to-holder (entry {owner: principal, seats: uint}))
    (let ((holder (get owner entry))
          (user-seats (get seats entry))
          (total-seats (var-get total-seats-taken))
          (total-fees (var-get accumulated-fees))
          (user-share (if (and (> user-seats u0) (> total-seats u0))
                         (/ (* total-fees user-seats) total-seats)
                         u0)))
        
        ;; Only distribute if the user's share is greater than zero
        (if (> user-share u0)
                (match (as-contract (contract-call? .sbtc-token 
                    transfer user-share tx-sender holder none))
                    success
                        (begin 
                            (print {
                            type: "fee-distribution",
                            recipient: holder,
                            seats: user-seats,
                            amount: user-share
                            })
                            true)
                    error false)  
            false)))

;; Helper to extract principal from seat-holder entry
(define-private (get-holder-principal (entry {owner: principal, seats: uint}))
    (get owner entry))

;; Get all unique seat holders
(define-read-only (get-all-seat-holders)
    (ok (var-get seat-holders)))

;; Get fee distribution info for UI
(define-read-only (get-fee-distribution-info)
    (ok {
        accumulated-fees: (var-get accumulated-fees),
        last-airdrop-height: (var-get last-airdrop-height),
        current-height: burn-block-height,
        cooldown-period: COOLDOWN-PERIOD,
        final-airdrop-mode: (var-get final-airdrop-mode),
        can-trigger-now: (can-trigger-airdrop)
    }))

;; Get user's expected share in the next airdrop
(define-read-only (get-user-expected-share (user principal))
    (let ((user-seats (default-to u0 (map-get? seats-owned user)))
          (total-seats (var-get total-seats-taken))
          (total-fees (var-get accumulated-fees)))
        
        (ok {
            user: user,
            user-seats: user-seats,
            total-seats: total-seats,
            total-accumulated-fees: total-fees,
            expected-share: (if (and (> user-seats u0) (> total-seats u0) (> total-fees u0))
                              (/ (* total-fees user-seats) total-seats)
                              u0)
        })))