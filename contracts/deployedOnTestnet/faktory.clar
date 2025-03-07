;; d1d47a21028d01952824e63dc04dcca45341a4690674e72756116b10cbc092c7
;; simple13 Powered By Faktory.fun v1.0 

(impl-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait)
(impl-trait 'ST3YT0XW92E6T2FE59B2G5N2WNNFSBZ6MZKQS5D18.aibtc-dao-traits-v2.token)

(define-constant ERR-NOT-AUTHORIZED u401)
(define-constant ERR-NOT-OWNER u402)

(define-fungible-token SIMPLE13 MAX)
(define-constant MAX u100000000000000000)
(define-data-var contract-owner principal 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.simple13-token-owner)
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json"))

;; SIP-10 Functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
       (asserts! (is-eq tx-sender sender) (err ERR-NOT-AUTHORIZED))
       (match (ft-transfer? SIMPLE13 amount sender recipient)
          response (begin
            (print memo)
            (ok response))
          error (err error)
        )
    )
)

(define-public (set-token-uri (value (string-utf8 256)))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
        (var-set token-uri (some value))
        (ok (print {
              notification: "token-metadata-update",
              payload: {
                contract-id: (as-contract tx-sender),
                token-class: "ft"
              }
            })
        )
    )
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance SIMPLE13 account))
)

(define-read-only (get-name)
  (ok "ai sbtc")
)

(define-read-only (get-symbol)
  (ok "SIMPLE13")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply SIMPLE13))
)

(define-read-only (get-token-uri)
    (ok (var-get token-uri))
)

(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (print {new-owner: new-owner})
    (ok (var-set contract-owner new-owner))
  )
)

;; ---------------------------------------------------------

(define-public (send-many (recipients (list 200 { to: principal, amount: uint, memo: (optional (buff 34)) })))
  (fold check-err (map send-token recipients) (ok true))
)

(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
  (match prior ok-value result err-value (err err-value))
)

(define-private (send-token (recipient { to: principal, amount: uint, memo: (optional (buff 34)) }))
  (send-token-with-memo (get amount recipient) (get to recipient) (get memo recipient))
)

(define-private (send-token-with-memo (amount uint) (to principal) (memo (optional (buff 34))))
  (let ((transferOk (try! (transfer amount tx-sender to memo))))
    (ok transferOk)
  )
)

;; ---------------------------------------------------------

(begin 
    ;; ft distribution
    (try! (ft-mint? SIMPLE13 (/ (* MAX u80) u100) 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.simple13-treasury)) ;; 80% treasury
    (try! (ft-mint? SIMPLE13 (/ (* MAX u20) u100) 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.simple13-faktory-dex)) ;; 16% dex ;; Rafa put back on !not 20%
    ;; (try! (ft-mint? SIMPLE13 (/ (* MAX u4) u100) 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.simple13-pre-faktory)) ;; 4% faktory ;; Rafa put back on

    (print { 
        type: "faktory-trait-v1", 
        name: "ai sbtc",
        symbol: "SIMPLE13",
        token-uri: u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json", 
        tokenContract: (as-contract tx-sender),
        supply: MAX, 
        decimals: u8, 
        targetStx: u5000000,
        tokenToDex: (/ (* MAX u20) u100), ;; put back (/ (* MAX u16) u100),
        tokenToDeployer: u0,  ;; put back on (/ (* MAX u4) u100),
        stxToDex: u0,
        stxBuyFirstFee: u0,
    })
)