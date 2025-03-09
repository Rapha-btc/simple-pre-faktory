import { beforeEach, describe, expect, it } from "vitest";
import {
  deployer,
  deployStubToken,
  getSbtc,
  stubTokenContract,
  token,
} from "./helpers";
import {
  cvToJSON,
  falseCV,
  responseErrorCV,
  responseOkCV,
  trueCV,
  uintCV,
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const feeReceiver = "ST1Y9QV2CY6R0NQNS8CPA5C2835QNGHMTFE94FV5R";
const preFactory = `${deployer}.name-pre-faktory`;
const dex = `${deployer}.name-faktory-dex`;

describe("buy", () => {
  const completeCurve = () => {
    getSbtc(address1);
    getSbtc(address2);
    getSbtc(address3);

    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address1
    );

    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address2
    );

    return simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address3
    );
  };

  beforeEach(() => {
    getSbtc(address1);
  });

  it("only allows buying from the designated token", () => {
    deployStubToken();
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [stubTokenContract, uintCV(10_000)],
      address1
    );
    expect(result).toEqual(responseErrorCV(uintCV(401)));
  });

  it("only allows buying when the contract is open for sales", () => {
    completeCurve();
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(10_000)],
      address1
    );
    expect(result).toEqual(responseErrorCV(uintCV(1001)));
  });

  it("should transfer 60% of the calculated fee minus to the FEE-RECEIVER", () => {
    const getIn = cvToJSON(
      simnet.callReadOnlyFn(
        "name-faktory-dex",
        "get-in",
        [uintCV(100_000)],
        deployer
      ).result
    );
    const fee = Number(getIn.value.value.fee.value);
    const calculatedFee = Math.floor(fee * 0.6);
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[1]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "${calculatedFee}",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "${feeReceiver}",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should transfer 40% of the fee to the 'pre-faktory' contract", () => {
    const getIn = cvToJSON(
      simnet.callReadOnlyFn(
        "name-faktory-dex",
        "get-in",
        [uintCV(100_000)],
        deployer
      ).result
    );
    const fee = Number(getIn.value.value.fee.value);
    const calculatedPreFee = Math.floor(fee * 0.4);
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "${calculatedPreFee}",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "${preFactory}",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("create a fee receipt in the 'pre-faktory' contract", () => {
    const getIn = cvToJSON(
      simnet.callReadOnlyFn(
        "name-faktory-dex",
        "get-in",
        [uintCV(100_000)],
        deployer
      ).result
    );
    const fee = Number(getIn.value.value.fee.value);
    const calculatedPreFee = Math.floor(fee * 0.4);
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[3]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "${preFactory}",
          "raw_value": "0x0c0000000306616d6f756e74010000000000000000000000000000032011746f74616c2d616363756d756c61746564010000000000000000000000000000032004747970650d0000000d666565732d7265636569766564",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": ${calculatedPreFee}n,
              },
              "total-accumulated": {
                "type": 1,
                "value": 800n,
              },
              "type": {
                "data": "fees-received",
                "type": 13,
              },
            },
            "type": 12,
          },
        },
        "event": "print_event",
      }
    `);
  });

  it("should transfer the bought token to the buyer", () => {
    const getIn = cvToJSON(
      simnet.callReadOnlyFn(
        "name-faktory-dex",
        "get-in",
        [uintCV(100_000)],
        deployer
      ).result
    );
    const boughtTokens = Number(getIn.value.value["tokens-out"].value);
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[4]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "${boughtTokens}",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
          "recipient": "${address1}",
          "sender": "${dex}",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should send the new ft token balance and the new sbtc balance after a buy", () => {
    const getIn = cvToJSON(
      simnet.callReadOnlyFn(
        "name-faktory-dex",
        "get-in",
        [uintCV(100_000)],
        deployer
      ).result
    );
    const tokenBalanceBefore = Number(
      cvToJSON(simnet.getDataVar(dex, "ft-balance")).value
    );
    const sbtcBalanceBefore = Number(
      cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    );
    const boughtTokens = Number(getIn.value.value["tokens-out"].value);
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));

    const tokenBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "ft-balance")).value
    );
    const sbtcBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    );

    expect(tokenBalanceAfter).toEqual(tokenBalanceBefore - boughtTokens);
    expect(sbtcBalanceAfter).toEqual(sbtcBalanceBefore + 98_000); // 100_000 - 2_000 fee
  });

  it("should print a buy receipt", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );

    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[6]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "raw_value": "0x0c000000090366656501000000000000000000000000000007d0026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e63650100000000000000000033c51c43b8b6ca056d616b6572051a7321b74e2b6a7e949e6c4ad313035b1665095017046f70656e030b7374782d62616c616e63650100000000000000000000000000017ed00a746f6b656e732d6f7574010000000000000000000512ce08af493604747970650d00000003627579047573747801000000000000000000000000000186a0",
          "topic": "print",
          "value": {
            "data": {
              "fee": {
                "type": 1,
                "value": 2000n,
              },
              "ft": {
                "address": {
                  "hash160": "6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce",
                  "type": 0,
                  "version": 26,
                },
                "contractName": {
                  "content": "name-faktory",
                  "lengthPrefixBytes": 1,
                  "maxLengthBytes": 128,
                  "type": 2,
                },
                "type": 6,
              },
              "ft-balance": {
                "type": 1,
                "value": 14571948998178506n,
              },
              "maker": {
                "address": {
                  "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                  "type": 0,
                  "version": 26,
                },
                "type": 5,
              },
              "open": {
                "type": 3,
              },
              "stx-balance": {
                "type": 1,
                "value": 98000n,
              },
              "tokens-out": {
                "type": 1,
                "value": 1428051001821494n,
              },
              "type": {
                "data": "buy",
                "type": 13,
              },
              "ustx": {
                "type": 1,
                "value": 100000n,
              },
            },
            "type": 12,
          },
        },
        "event": "print_event",
      }
    `);
  });

  describe("when the dex completes the bonding curve", () => {
    it("should transfer a percentage of the fungible token premium to the 'FAKTORY' agent address", () => {
      const { result, events } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));
      expect(events[6]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "348837209302325",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should transfer the remainder of the fungible token premium to the 'ORIGINATOR' address", () => {
      const { result, events } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));
      expect(events[8]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "232558139534884",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should transfer a fee to the graduation fee receiver address", () => {
      const { result, events } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));
      expect(events[10]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "100000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST3BA7GVAKQTCTX68VPAD9W8CBYG71JNMGBCAD48N",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should toggle the curve bond status in the 'pre-faktory' contract", () => {
      const acceleratedVesting = simnet.getDataVar(
        "name-pre-faktory",
        "accelerated-vesting"
      );
      const finalAirdropMode = simnet.getDataVar(
        "name-pre-faktory",
        "final-airdrop-mode"
      );
      expect([acceleratedVesting, finalAirdropMode]).toEqual([
        falseCV(),
        falseCV(),
      ]);
      const { result } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));

      const acceleratedVestingAfterBonding = simnet.getDataVar(
        "name-pre-faktory",
        "accelerated-vesting"
      );
      const finalAirdropModeAfterBonding = simnet.getDataVar(
        "name-pre-faktory",
        "final-airdrop-mode"
      );
      expect([
        acceleratedVestingAfterBonding,
        finalAirdropModeAfterBonding,
      ]).toEqual([trueCV(), trueCV()]);
    });

    it("should set the dex as closed, and the usbtc and fungible tokens balances to 0", () => {
      const { result } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));
      const ftBalance = simnet.getDataVar(dex, "ft-balance");
      const usbtcBalance = simnet.getDataVar(dex, "stx-balance");
      const open = simnet.getDataVar(dex, "open");
      expect([ftBalance, usbtcBalance, open]).toEqual([
        uintCV(0),
        uintCV(0),
        falseCV(),
      ]);
    });

    it("should print a receipt when the bonding curve is complete", () => {
      const { result, events } = completeCurve();

      expect(result).toEqual(responseOkCV(trueCV()));
      expect(events[11]).toMatchInlineSnapshot(`
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
            "raw_value": "0x0c0000000d0a616d6d2d616d6f756e7401000000000000000000063253f5b97a0c08616d6d2d757374780100000000000000000000000000583220036665650100000000000000000000000000009c40026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e6365010000000000000000000000000000000008677261642d66656501000000000000000000000000000186a0056d616b6572051aa5180cc1ff6050df53f0ab766d76b630e14feb0c046f70656e040e7072656d69756d2d616d6f756e74010000000000000000000210c6a73dd3590b7374782d62616c616e636501000000000000000000000000000000000a746f6b656e732d6f757401000000000000000000034a9a3634baee04747970650d00000003627579047573747801000000000000000000000000001e8480",
            "topic": "print",
            "value": {
              "data": {
                "amm-amount": {
                  "type": 1,
                  "value": 1744186046511628n,
                },
                "amm-ustx": {
                  "type": 1,
                  "value": 5780000n,
                },
                "fee": {
                  "type": 1,
                  "value": 40000n,
                },
                "ft": {
                  "address": {
                    "hash160": "6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce",
                    "type": 0,
                    "version": 26,
                  },
                  "contractName": {
                    "content": "name-faktory",
                    "lengthPrefixBytes": 1,
                    "maxLengthBytes": 128,
                    "type": 2,
                  },
                  "type": 6,
                },
                "ft-balance": {
                  "type": 1,
                  "value": 0n,
                },
                "grad-fee": {
                  "type": 1,
                  "value": 100000n,
                },
                "maker": {
                  "address": {
                    "hash160": "a5180cc1ff6050df53f0ab766d76b630e14feb0c",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "open": {
                  "type": 4,
                },
                "premium-amount": {
                  "type": 1,
                  "value": 581395348837209n,
                },
                "stx-balance": {
                  "type": 1,
                  "value": 0n,
                },
                "tokens-out": {
                  "type": 1,
                  "value": 926451124976366n,
                },
                "type": {
                  "data": "buy",
                  "type": 13,
                },
                "ustx": {
                  "type": 1,
                  "value": 2000000n,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        }
      `);
    });
  });
});

describe("sell", () => {
  beforeEach(() => {
    getSbtc(address1);
    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );
  });

  it("should only allow selling the designated token", () => {
    deployStubToken();
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [stubTokenContract, uintCV(10_000)],
      address1
    );
    expect(result).toEqual(responseErrorCV(uintCV(401)));
  });

  it.skip("should not allow selling if the usbtc balance in the contract is too low", () => {
    // Skipping this test since it's not clear the use case that could lead to this
  });

  it("should transfer the sold token to the contract", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[0]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "500000000000000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should transfer the calculated usbtc to the seller", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "35697",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should transfer a uSbtc fee to the fee receiver address", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[3]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "437",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1Y9QV2CY6R0NQNS8CPA5C2835QNGHMTFE94FV5R",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should transfer a uSbtc fee from the sender to the pre-faktory contract", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[4]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "291",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should print a receipt from the pre-faktory contract", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[5]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c0000000306616d6f756e74010000000000000000000000000000012311746f74616c2d616363756d756c61746564010000000000000000000000000000044304747970650d0000000d666565732d7265636569766564",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": 291n,
              },
              "total-accumulated": {
                "type": 1,
                "value": 1091n,
              },
              "type": {
                "data": "fees-received",
                "type": 13,
              },
            },
            "type": 12,
          },
        },
        "event": "print_event",
      }
    `);
  });

  it("should set the new balance for the token and sBtc after sell", () => {
    const usbtcBalanceBefore = Number(
      cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    );
    const tokenBalanceBefore = Number(
      cvToJSON(simnet.getDataVar(dex, "ft-balance")).value
    );
    simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );

    const usbtcBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    );
    const tokenBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "ft-balance")).value
    );
    const sellPrice = 35697;
    const fees = 437 + 291;
    expect(usbtcBalanceAfter).toBe(usbtcBalanceBefore - sellPrice - fees);
    expect(tokenBalanceAfter).toBe(tokenBalanceBefore + 500_000_000_000_000);
  });

  it("should print the sell-related info", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "sell",
      [token, uintCV(500_000_000_000_000)],
      address1
    );
    expect(result).toEqual(responseOkCV(trueCV()));
    expect(events[6]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "raw_value": "0x0c0000000906616d6f756e740100000000000000000001c6bf526340000366656501000000000000000000000000000002d8026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e636501000000000000000000358bdb961bf6ca056d616b6572051a7321b74e2b6a7e949e6c4ad313035b1665095017046f70656e030b7374782d62616c616e6365010000000000000000000000000000f0870f7374782d746f2d72656365697665720100000000000000000000000000008b7104747970650d0000000473656c6c",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": 500000000000000n,
              },
              "fee": {
                "type": 1,
                "value": 728n,
              },
              "ft": {
                "address": {
                  "hash160": "6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce",
                  "type": 0,
                  "version": 26,
                },
                "contractName": {
                  "content": "name-faktory",
                  "lengthPrefixBytes": 1,
                  "maxLengthBytes": 128,
                  "type": 2,
                },
                "type": 6,
              },
              "ft-balance": {
                "type": 1,
                "value": 15071948998178506n,
              },
              "maker": {
                "address": {
                  "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                  "type": 0,
                  "version": 26,
                },
                "type": 5,
              },
              "open": {
                "type": 3,
              },
              "stx-balance": {
                "type": 1,
                "value": 61575n,
              },
              "stx-to-receiver": {
                "type": 1,
                "value": 35697n,
              },
              "type": {
                "data": "sell",
                "type": 13,
              },
            },
            "type": 12,
          },
        },
        "event": "print_event",
      }
    `);
  });
});

describe("get-in", () => {
  it("should give the relevant data for a given uSbtc buy", () => {
    const result1 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-in", [uintCV(50_000_000)], address1)
        .result
    );
    expect(result1).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint))",
          "value": {
            "fee": {
              "type": "uint",
              "value": "1000000",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "16000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "320000000000000",
            },
            "new-stk": {
              "type": "uint",
              "value": "50000000",
            },
            "new-stx": {
              "type": "uint",
              "value": "49000000",
            },
            "stx-in": {
              "type": "uint",
              "value": "49000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "5150000",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15680000000000000",
            },
            "total-stk": {
              "type": "uint",
              "value": "1000000",
            },
            "total-stx": {
              "type": "uint",
              "value": "0",
            },
          },
        },
      }
    `);

    const result2 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-in", [uintCV(100_000_000)], address1)
        .result
    );
    expect(result2).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint))",
          "value": {
            "fee": {
              "type": "uint",
              "value": "2000000",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "16000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "161616161616161",
            },
            "new-stk": {
              "type": "uint",
              "value": "99000000",
            },
            "new-stx": {
              "type": "uint",
              "value": "98000000",
            },
            "stx-in": {
              "type": "uint",
              "value": "98000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "5150000",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15838383838383839",
            },
            "total-stk": {
              "type": "uint",
              "value": "1000000",
            },
            "total-stx": {
              "type": "uint",
              "value": "0",
            },
          },
        },
      }
    `);

    const result3 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-in", [uintCV(200_000_000)], address1)
        .result
    );
    expect(result3).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-in uint) (stx-to-grad uint) (tokens-out uint) (total-stk uint) (total-stx uint))",
          "value": {
            "fee": {
              "type": "uint",
              "value": "4000000",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "16000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "81218274111675",
            },
            "new-stk": {
              "type": "uint",
              "value": "197000000",
            },
            "new-stx": {
              "type": "uint",
              "value": "196000000",
            },
            "stx-in": {
              "type": "uint",
              "value": "196000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "5150000",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15918781725888325",
            },
            "total-stk": {
              "type": "uint",
              "value": "1000000",
            },
            "total-stx": {
              "type": "uint",
              "value": "0",
            },
          },
        },
      }
    `);
  });
});

describe("get-out", () => {
  it("should give the relevant data for a given token sell", () => {
    getSbtc(address1);
    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(1_000_000)],
      address1
    );
    const result1 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-out", [uintCV(50_000_000)], address1)
        .result
    );
    expect(result1).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint))",
          "value": {
            "amount-in": {
              "type": "uint",
              "value": "50000000",
            },
            "fee": {
              "type": "uint",
              "value": "0",
            },
            "ft-balance": {
              "type": "uint",
              "value": "8080808080808080",
            },
            "k": {
              "type": "uint",
              "value": "15999999999999998400000",
            },
            "new-ft": {
              "type": "uint",
              "value": "8080808130808080",
            },
            "new-stk": {
              "type": "uint",
              "value": "1979999",
            },
            "new-stx": {
              "type": "uint",
              "value": "980000",
            },
            "stx-out": {
              "type": "uint",
              "value": "0",
            },
            "stx-to-receiver": {
              "type": "uint",
              "value": "0",
            },
            "total-stk": {
              "type": "uint",
              "value": "1980000",
            },
            "total-stx": {
              "type": "uint",
              "value": "980000",
            },
          },
        },
      }
    `);

    const result2 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-out", [uintCV(100_000_000)], address1)
        .result
    );
    expect(result2).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint))",
          "value": {
            "amount-in": {
              "type": "uint",
              "value": "100000000",
            },
            "fee": {
              "type": "uint",
              "value": "0",
            },
            "ft-balance": {
              "type": "uint",
              "value": "8080808080808080",
            },
            "k": {
              "type": "uint",
              "value": "15999999999999998400000",
            },
            "new-ft": {
              "type": "uint",
              "value": "8080808180808080",
            },
            "new-stk": {
              "type": "uint",
              "value": "1979999",
            },
            "new-stx": {
              "type": "uint",
              "value": "980000",
            },
            "stx-out": {
              "type": "uint",
              "value": "0",
            },
            "stx-to-receiver": {
              "type": "uint",
              "value": "0",
            },
            "total-stk": {
              "type": "uint",
              "value": "1980000",
            },
            "total-stx": {
              "type": "uint",
              "value": "980000",
            },
          },
        },
      }
    `);

    const result3 = cvToJSON(
      simnet.callReadOnlyFn(dex, "get-out", [uintCV(200_000_000)], address1)
        .result
    );
    expect(result3).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "(response (tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint)) UnknownType)",
        "value": {
          "type": "(tuple (amount-in uint) (fee uint) (ft-balance uint) (k uint) (new-ft uint) (new-stk uint) (new-stx uint) (stx-out uint) (stx-to-receiver uint) (total-stk uint) (total-stx uint))",
          "value": {
            "amount-in": {
              "type": "uint",
              "value": "200000000",
            },
            "fee": {
              "type": "uint",
              "value": "0",
            },
            "ft-balance": {
              "type": "uint",
              "value": "8080808080808080",
            },
            "k": {
              "type": "uint",
              "value": "15999999999999998400000",
            },
            "new-ft": {
              "type": "uint",
              "value": "8080808280808080",
            },
            "new-stk": {
              "type": "uint",
              "value": "1979999",
            },
            "new-stx": {
              "type": "uint",
              "value": "980000",
            },
            "stx-out": {
              "type": "uint",
              "value": "0",
            },
            "stx-to-receiver": {
              "type": "uint",
              "value": "0",
            },
            "total-stk": {
              "type": "uint",
              "value": "1980000",
            },
            "total-stx": {
              "type": "uint",
              "value": "980000",
            },
          },
        },
      }
    `);
  });
});

describe("open-market", () => {
  it("should not open the market if pre token distribution has not happened", () => {
    const { result } = simnet.callPublicFn(dex, "open-market", [], address1);
    expect(result).toEqual(responseErrorCV(uintCV(1001)));
  });
});
