;; 3ffc48440d8dc2bd86b328355351467275607b40f6b74499d90cbbb13a4618f7
;; NAME Powered By Faktory.fun v1.0 

(impl-trait .faktory-trait-v1.sip-010-trait) ;; 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A
(impl-trait .aibtc-dao-traits-v2.token) ;; 'ST3YT0XW92E6T2FE59B2G5N2WNNFSBZ6MZKQS5D18

(define-constant ERR-NOT-AUTHORIZED u401)
(define-constant ERR-NOT-OWNER u402)

(define-fungible-token NAME MAX)
(define-constant MAX u100000000000000000)
(define-data-var contract-owner principal tx-sender) ;; 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.name-token-owner)
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json"))

;; SIP-10 Functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
       (asserts! (is-eq tx-sender sender) (err ERR-NOT-AUTHORIZED))
       (match (ft-transfer? NAME amount sender recipient)
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
  (ok (ft-get-balance NAME account))
)

(define-read-only (get-name)
  (ok "ai sbtc")
)

(define-read-only (get-symbol)
  (ok "NAME")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply NAME))
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
    ;; (try! (ft-mint? NAME (/ (* MAX u80) u100) .name-treasury)) ;; 80% treasury
    (try! (ft-mint? NAME (/ (* MAX u16) u100) .name-faktory-dex)) ;; 16% dex ;; Rafa put back on !not 20%
    (try! (ft-mint? NAME (/ (* MAX u4) u100) .name-pre-faktory)) ;; 4% faktory ;; Rafa put back on

    ;; (try! (as-contract (contract-call? .name-pre-faktory initialize-token-distribution-demo))) ;; this address could be a multi-sig  
    (unwrap! (as-contract (contract-call? .name-pre-faktory initialize-token-distribution-demo)) (err "failed to initialize-token-distribution-demo"))

    (print { 
        type: "faktory-trait-v1", 
        name: "ai sbtc",
        symbol: "NAME",
        token-uri: u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json", 
        tokenContract: (as-contract tx-sender),
        supply: MAX, 
        decimals: u8, 
        targetStx: u5000000,
        tokenToDex: (/ (* MAX u16) u100),
        tokenToDeployer: (/ (* MAX u4) u100),
        stxToDex: u0,
        stxBuyFirstFee: u0,
    })
)