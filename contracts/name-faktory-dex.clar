;; 594f5fc947937dc93684965a4f7d7cd057d87c94fa9423bd256a9fc35907159f
    ;; aibtc.dev DAO faktory.fun DEX @version 1.0
  
    (impl-trait .aibtc-dao-traits-v2.faktory-dex) ;; 'ST3YT0XW92E6T2FE59B2G5N2WNNFSBZ6MZKQS5D18
    (impl-trait .faktory-dex-trait-v1-1.dex-trait) ;; 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A
    (use-trait faktory-token .faktory-trait-v1.sip-010-trait) ;; 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A
    
    (define-constant ERR-MARKET-CLOSED (err u1001))
    (define-constant ERR-STX-NON-POSITIVE (err u1002))
    (define-constant ERR-STX-BALANCE-TOO-LOW (err u1003))
    (define-constant ERR-FT-NON-POSITIVE (err u1004))
    (define-constant ERR-FETCHING-BUY-INFO (err u1005)) 
    (define-constant ERR-FETCHING-SELL-INFO (err u1006)) 
    (define-constant ERR-TOKEN-NOT-AUTH (err u401))
    (define-constant ERR-UNAUTHORIZED-CALLER (err u402))
    
    (define-constant FEE-RECEIVER 'ST1Y9QV2CY6R0NQNS8CPA5C2835QNGHMTFE94FV5R)
    (define-constant G-RECEIVER 'ST3BA7GVAKQTCTX68VPAD9W8CBYG71JNMGBCAD48N)
  
    (define-constant FAKTORY 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A)
    (define-constant ORIGINATOR 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A) ;; this is creator address
    (define-constant DEX-TOKEN .name-faktory)
    
    ;; token constants
    (define-constant TARGET_STX u5000000)
    (define-constant FAK_STX u1000000) ;; this will be 1M satoshis
    (define-constant GRAD-FEE u100000)
    
    ;; data vars
    (define-data-var open bool false)
    (define-data-var fak-ustx uint u0)
    (define-data-var ft-balance uint u0)
    (define-data-var stx-balance uint u0)
    (define-data-var premium uint u25)
    
    (define-public (buy (ft <faktory-token>) (ubtc uint))
      (begin
        (asserts! (is-eq DEX-TOKEN (contract-of ft)) ERR-TOKEN-NOT-AUTH)
        (asserts! (var-get open) ERR-MARKET-CLOSED)
        (asserts! (> ubtc u0) ERR-STX-NON-POSITIVE)
        (let (
              (in-info (unwrap! (get-in ubtc) ERR-FETCHING-BUY-INFO))
              (total-stx (get total-stx in-info))
              (total-stk (get total-stk in-info))
              (total-ft (get ft-balance in-info))
              (k (get k in-info))
              (fee (get fee in-info))
              (pre-fee (/ (* fee u40) u100))
              (stx-in (get stx-in in-info))
              (new-stk (get new-stk in-info))
              (new-ft (get new-ft in-info))
              (tokens-out (get tokens-out in-info))
              (new-stx (get new-stx in-info))
              (ft-receiver tx-sender)
              )
        (try! (contract-call? .sbtc-token 
               transfer (- fee pre-fee) tx-sender FEE-RECEIVER none)) 
        (try! (contract-call? .sbtc-token 
              transfer pre-fee tx-sender .name-pre-faktory none))
        (try! (as-contract (contract-call? .name-pre-faktory create-fees-receipt pre-fee)))        
        (try! (contract-call? .sbtc-token 
               transfer stx-in tx-sender (as-contract tx-sender) none))
          (try! (as-contract (contract-call? ft transfer tokens-out tx-sender ft-receiver none)))
          (if (>= new-stx TARGET_STX)
              (let ((premium-amount (/ (* new-ft (var-get premium)) u100))
                    (amm-amount (- new-ft premium-amount))
                    (agent-amount (/ (* premium-amount u60) u100))
                    (originator-amount (- premium-amount agent-amount))
                    (amm-ustx (- new-stx GRAD-FEE))
                    (xyk-pool-uri (default-to u"https://bitflow.finance" (try! (contract-call? ft get-token-uri))))
                    (xyk-burn-amount (- (sqrti (* amm-ustx amm-amount)) u1)))
              (try! (as-contract (contract-call? ft transfer agent-amount tx-sender FAKTORY none)))
              (try! (as-contract (contract-call? ft transfer originator-amount tx-sender ORIGINATOR none)))
                ;; (try! (as-contract 
                ;;        (contract-call? 
                ;;          'ST295MNE41DC74QYCPRS8N37YYMC06N6Q3VQDZ6G1.xyk-core-v-1-2 
                ;;              create-pool 
                ;;              'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.xyk-pool-stx-name-v-1-1
                ;;              'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token
                ;;              ft
                ;;              amm-ustx 
                ;;              amm-amount 
                ;;              xyk-burn-amount 
                ;;              u10 u40 u10 u40 
                ;;              'ST27Q7Z7P5MTJN2B3M9Q406XPCDB1VFZJ3KWX3CES xyk-pool-uri true)))
                (try! (as-contract (contract-call? .sbtc-token 
                                    transfer GRAD-FEE tx-sender G-RECEIVER none)))
                (var-set open false)
                (var-set stx-balance u0)
                (var-set ft-balance u0)
               (try! (as-contract (contract-call? .name-pre-faktory toggle-bonded))) 
                (print {type: "buy", ft: (contract-of ft), tokens-out: tokens-out, ustx: ubtc, premium-amount: premium-amount, amm-amount: amm-amount,
                        amm-ustx: amm-ustx,
                        stx-balance: u0, ft-balance: u0,
                        fee: fee, grad-fee: GRAD-FEE, maker: tx-sender,
                        open: false})
                (ok true))
              (begin
                  (var-set stx-balance new-stx)
                  (var-set ft-balance new-ft)
                  (print {type: "buy", ft: (contract-of ft), tokens-out: tokens-out, ustx: ubtc, maker: tx-sender,
                          stx-balance: new-stx, ft-balance: new-ft,
                          fee: fee,
                          open: true})
              (ok true))))))
    
    (define-read-only (get-in (ubtc uint))
      (let ((total-stx (var-get stx-balance))
            (total-stk (+ total-stx (var-get fak-ustx)))
            (total-ft (var-get ft-balance))
            (k (* total-ft total-stk))
            (fee (/ (* ubtc u2) u100))
            (stx-in (- ubtc fee))
            (new-stk (+ total-stk stx-in))
            (new-ft (/ k new-stk))
            (tokens-out (- total-ft new-ft))
            (raw-to-grad (- TARGET_STX total-stx))
            (stx-to-grad (/ (* raw-to-grad u103) u100)))
        (ok {total-stx: total-stx,
             total-stk: total-stk,
             ft-balance: total-ft,
             k: k,
             fee: fee,
             stx-in: stx-in,
             new-stk: new-stk,
             new-ft: new-ft,
             tokens-out: tokens-out,
             new-stx: (+ total-stx stx-in),
             stx-to-grad: stx-to-grad
             })))
    
    (define-public (sell (ft <faktory-token>) (amount uint))
      (begin
        (asserts! (is-eq DEX-TOKEN (contract-of ft)) ERR-TOKEN-NOT-AUTH)
        (asserts! (var-get open) ERR-MARKET-CLOSED)
        (asserts! (> amount u0) ERR-FT-NON-POSITIVE)
        (let (
              (out-info (unwrap! (get-out amount) ERR-FETCHING-SELL-INFO))
              (total-stx (get total-stx out-info))
              (total-stk (get total-stk out-info))
              (total-ft (get ft-balance out-info))
              (k (get k out-info))
              (new-ft (get new-ft out-info))
              (new-stk (get new-stk out-info))
              (stx-out (get stx-out out-info))
              (fee (get fee out-info))
              (pre-fee (/ (* fee u40) u100))
              (stx-to-receiver (get stx-to-receiver out-info))
              (new-stx (get new-stx out-info))
              (stx-receiver tx-sender)
              )
          (asserts! (>= total-stx stx-out) ERR-STX-BALANCE-TOO-LOW)
          (try! (contract-call? ft transfer amount tx-sender (as-contract tx-sender) none))
          (try! (as-contract (contract-call? .sbtc-token 
                              transfer stx-to-receiver tx-sender stx-receiver none)))
          (try! (as-contract (contract-call? .sbtc-token 
                              transfer (- fee pre-fee) tx-sender FEE-RECEIVER none))) 
          (try! (contract-call? .sbtc-token 
                              transfer pre-fee tx-sender .name-pre-faktory none))
          (try! (as-contract (contract-call? .name-pre-faktory create-fees-receipt pre-fee))) ;; this address could be a multi-sig        
          (var-set stx-balance new-stx)
          (var-set ft-balance new-ft)
          (print {type: "sell", ft: (contract-of ft), amount: amount, stx-to-receiver: stx-to-receiver, maker: tx-sender,
                  stx-balance: new-stx, ft-balance: new-ft,
                  fee: fee,
                  open: true})
          (ok true))))
    
    (define-read-only (get-out (amount uint))
      (let ((total-stx (var-get stx-balance))
            (total-stk (+ total-stx (var-get fak-ustx)))
            (total-ft (var-get ft-balance))
            (k (* total-ft total-stk))
            (new-ft (+ total-ft amount))
            (new-stk (/ k new-ft))
            (stx-out (- (- total-stk new-stk) u1))
            (fee (/ (* stx-out u2) u100))
            (stx-to-receiver (- stx-out fee)))
        (ok {
             total-stx: total-stx,
             total-stk: total-stk,
             ft-balance: total-ft,
             k: k,
             new-ft: new-ft,
             new-stk: new-stk,
             stx-out: stx-out,
             fee: fee,
             stx-to-receiver: stx-to-receiver,
             amount-in: amount,
             new-stx: (- total-stx stx-out)
             })))
    
    (define-read-only (get-open)
      (ok (var-get open)))
    
    (define-public (open-market) 
      (begin 
        (asserts! (is-eq contract-caller PRELAUNCH-DAO) ERR-UNAUTHORIZED-CALLER)
        (var-set open true)
        (ok true)
      )
    )
    
    ;; boot dex
      (begin
        (var-set fak-ustx FAK_STX)
        (var-set ft-balance u20000000000000000)
        (var-set stx-balance u0)
        ;; (var-set open true) -> remove this set by pre-launch 
          (print { 
              type: "faktory-dex-trait-v1-1", 
              dexContract: (as-contract tx-sender),
            ;;   ammReceiver: 'ST295MNE41DC74QYCPRS8N37YYMC06N6Q3VQDZ6G1.xyk-core-v-1-2,
            ;;   poolName: 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.xyk-pool-stx-name-v-1-1
         })
        (ok true))