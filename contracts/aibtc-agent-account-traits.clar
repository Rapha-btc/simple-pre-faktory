;; title: aibtc-agent-account-traits
;; version: 3.3.3
;; summary: A collection of traits for smart contracts that manage agent accounts.

;; IMPORTS
;; (use-trait sip010-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.sip-010-trait-ft-standard.sip-010-trait)
;; (use-trait dao-action-trait 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-dao-traits.action)
;; (use-trait dao-proposal-trait 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-dao-traits.proposal)
;; (use-trait dao-action-proposal-trait 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-dao-traits.action-proposal-voting)
;; (use-trait dao-faktory-dex 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-dao-traits.faktory-dex)

;; ACCOUNT TRAITS

;; (define-trait aibtc-account (
;;   (deposit-stx
;;     (uint)
;;     (response bool uint)
;;   )
;;   (deposit-ft
;;     (<sip010-trait> uint)
;;     (response bool uint)
;;   )
;;   (withdraw-stx
;;     (uint)
;;     (response bool uint)
;;   )
;;   (withdraw-ft
;;     (<sip010-trait> uint)
;;     (response bool uint)
;;   )
;; ))

;; (define-trait aibtc-account-proposals (
;;   (create-action-proposal
;;     (<dao-action-proposal-trait> <dao-action-trait> (buff 2048) (optional (string-ascii 1024)))
;;     (response bool uint)
;;   )
;;   (vote-on-action-proposal
;;     (<dao-action-proposal-trait> uint bool)
;;     (response bool uint)
;;   )
;;   (veto-action-proposal
;;     (<dao-action-proposal-trait> uint)
;;     (response bool uint)
;;   )
;;   (conclude-action-proposal
;;     (<dao-action-proposal-trait> uint <dao-action-trait>)
;;     (response bool uint)
;;   )
;; ))

;; ;; used by agent account to call swap adapter
;; (define-trait aibtc-account-swaps (
;;   (buy-dao-token
;;     (<aibtc-dao-swap-adapter> <sip010-trait> uint (optional uint))
;;     (response bool uint)
;;   )
;;   (sell-dao-token
;;     (<aibtc-dao-swap-adapter> <sip010-trait> uint (optional uint))
;;     (response bool uint)
;;   )
;; ))

;; ;; used by swap adapter to call 1:1 configured trading contract
;; ;; one adapter deployed per dao and trading contract pair
;; (define-trait aibtc-dao-swap-adapter (
;;   (buy-dao-token
;;     (<sip010-trait> uint (optional uint))
;;     (response bool uint)
;;   )
;;   (sell-dao-token
;;     (<sip010-trait> uint (optional uint))
;;     (response bool uint)
;;   )
;; ))

(define-trait aibtc-account-config (
  (set-agent-can-manage-assets
    (bool)
    (response bool uint)
  )
  (set-agent-can-use-proposals
    (bool)
    (response bool uint)
  )
  (set-agent-can-approve-revoke-contracts
    (bool)
    (response bool uint)
  )
  (set-agent-can-buy-sell-assets
    (bool)
    (response bool uint)
  )
  (approve-contract
    (principal uint)
    (response bool uint)
  )
  (revoke-contract
    (principal uint)
    (response bool uint)
  )
  (get-config
    ()
    (
      response       {
      account: principal,
      agent: principal,
      owner: principal,
      sbtc: principal,
    }
      uint
    )
  )
))