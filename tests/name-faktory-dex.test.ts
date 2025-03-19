import { beforeEach, describe, expect, it } from "vitest";
import {
  deployer,
  deployStubToken,
  getSbtc,
  openMarket,
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
const dex = `${deployer}.name-faktory-dex`;

describe("buy", () => {
  const completeCurve = () => {
    getSbtc(address1);
    getSbtc(address2);
    getSbtc(address3);

    // console.log("--- Starting completeCurve() ---");

    const result1 = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address1
    );
    // console.log("Buy 1 result:", result1.result);
    // console.log(
    //   "STX Balance after Buy 1:",
    //   cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    // );

    const result2 = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address2
    );
    // console.log("Buy 2 result:", result2.result);
    // console.log(
    //   "STX Balance after Buy 2:",
    //   cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    // );

    // Use a smaller amount for the final buy to avoid hitting your fat finger protection
    const result3 = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(950_000)],
      address3
    );
    // console.log("Buy 3 result:", result3.result);
    // console.log(
    //   "STX Balance after Buy 3:",
    //   cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    // );
    // console.log("TARGET_STX:", 5000000);

    // Now check if the market is closed/bonded
    // console.log("After all buys:");
    // console.log("- open:", cvToJSON(simnet.getDataVar(dex, "open")));
    // console.log("- bonded:", cvToJSON(simnet.getDataVar(dex, "bonded")));

    // Log all events to see exactly what's happening
    // console.log("--- All events from final buy ---");
    // for (let i = 0; i < result3.events.length; i++) {
    //   console.log(`Event ${i}:`, JSON.stringify(result3.events[i], null, 2));
    // }

    return result3;
  };

  beforeEach(() => {
    openMarket();
  });

  it("only allows buying from the designated token", () => {
    deployStubToken();
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [stubTokenContract, uintCV(10_000)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(401)));
  });

  it("only allows buying when the contract is open for sales", () => {
    completeCurve();
    const { result } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(10_000)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(1001)));
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[1]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "800",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c0000000306616d6f756e74010000000000000000000000000000032011746f74616c2d616363756d756c61746564010000000000000000000000000000032004747970650d0000000d666565732d7265636569766564",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": 800n,
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[3]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "98000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));

    const tokenBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "ft-balance")).value
    );
    const sbtcBalanceAfter = Number(
      cvToJSON(simnet.getDataVar(dex, "stx-balance")).value
    );

    expect(tokenBalanceAfter).toStrictEqual(tokenBalanceBefore - boughtTokens);
    expect(sbtcBalanceAfter).toStrictEqual(sbtcBalanceBefore + 98_000); // 100_000 - 2_000 fee
  });

  it("should print a buy receipt", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(100_000)],
      address1
    );

    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[6]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "raw_value": "0x0c000000090366656501000000000000000000000000000007d0026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e63650100000000000000000034b5fc969d35ef056d616b6572051a7321b74e2b6a7e949e6c4ad313035b1665095017046f70656e030b7374782d62616c616e63650100000000000000000000000000054f600a746f6b656e732d6f7574010000000000000000000421edb5caca1104747970650d00000003627579047573747801000000000000000000000000000186a0",
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
                "value": 14836795252225519n,
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
                "value": 348000n,
              },
              "tokens-out": {
                "type": 1,
                "value": 1163204747774481n,
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

  // useful perhaps: https://stxer.xyz/simulations/mainnet/8e1c471271e7b86a69ea341b0f452982
  describe("when the dex completes the bonding curve", () => {
    it("should transfer a percentage of the fungible token premium to the 'FAKTORY' agent address", () => {
      const { result, events } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[6]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "491722668415013",
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

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[8]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "327815112276676",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should send remaining tokens to AMM receiver", () => {
      const { result, events } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[10]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "2458613342075070",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should transfer AMM sats to AMM receiver", () => {
      const { result, events } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[12]).toMatchInlineSnapshot(`
        {
          "data": {
            "amount": "5001000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_transfer_event",
        }
      `);
    });

    it("should transfer a fee to the graduation fee receiver address", () => {
      const { result, events } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[13]).toMatchInlineSnapshot(`
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
      expect([acceleratedVesting, finalAirdropMode]).toStrictEqual([
        falseCV(),
        falseCV(),
      ]);
      const { result } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));

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
      ]).toStrictEqual([trueCV(), trueCV()]);
    });

    it("should set the dex as closed, and the usbtc and fungible tokens balances to 0", () => {
      const { result } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      const ftBalance = simnet.getDataVar(dex, "ft-balance");
      const usbtcBalance = simnet.getDataVar(dex, "stx-balance");
      const open = simnet.getDataVar(dex, "open");
      expect([ftBalance, usbtcBalance, open]).toStrictEqual([
        uintCV(0),
        uintCV(0),
        falseCV(),
      ]);
    });

    it("should print a receipt when the bonding curve is complete", () => {
      const { result, events } = completeCurve();

      expect(result).toStrictEqual(responseOkCV(trueCV()));
      expect(events[14]).toMatchInlineSnapshot(`
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
            "raw_value": "0x0c0000000d0a616d6d2d616d6f756e740100000000000000000008bc1886e4f8be08616d6d2d7573747801000000000000000000000000004c4f28036665650100000000000000000000000000004a38026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e6365010000000000000000000000000000000008677261642d66656501000000000000000000000000000186a0056d616b6572051aa5180cc1ff6050df53f0ab766d76b630e14feb0c046f70656e040e7072656d69756d2d616d6f756e740100000000000000000002e95d824c52e90b7374782d62616c616e636501000000000000000000000000000000000a746f6b656e732d6f7574010000000000000000000218e4c76c8db904747970650d00000003627579047573747801000000000000000000000000000e7ef0",
            "topic": "print",
            "value": {
              "data": {
                "amm-amount": {
                  "type": 1,
                  "value": 2458613342075070n,
                },
                "amm-ustx": {
                  "type": 1,
                  "value": 5001000n,
                },
                "fee": {
                  "type": 1,
                  "value": 19000n,
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
                  "value": 819537780691689n,
                },
                "stx-balance": {
                  "type": 1,
                  "value": 0n,
                },
                "tokens-out": {
                  "type": 1,
                  "value": 590320830811577n,
                },
                "type": {
                  "data": "buy",
                  "type": 13,
                },
                "ustx": {
                  "type": 1,
                  "value": 950000n,
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
    openMarket();
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
    expect(result).toStrictEqual(responseErrorCV(uintCV(401)));
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "43068",
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[3]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "527",
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[4]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "351",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[5]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c0000000306616d6f756e74010000000000000000000000000000015f11746f74616c2d616363756d756c61746564010000000000000000000000000000047f04747970650d0000000d666565732d7265636569766564",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": 351n,
              },
              "total-accumulated": {
                "type": 1,
                "value": 1151n,
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
    const sellPrice = 43068;
    const fees = 527 + 351;
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
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[6]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          "raw_value": "0x0c0000000906616d6f756e740100000000000000000001c6bf5263400003666565010000000000000000000000000000036e026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e636501000000000000000000367cbbe90075ef056d616b6572051a7321b74e2b6a7e949e6c4ad313035b1665095017046f70656e030b7374782d62616c616e6365010000000000000000000000000004a3b60f7374782d746f2d7265636569766572010000000000000000000000000000a83c04747970650d0000000473656c6c",
          "topic": "print",
          "value": {
            "data": {
              "amount": {
                "type": 1,
                "value": 500000000000000n,
              },
              "fee": {
                "type": 1,
                "value": 878n,
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
                "value": 15336795252225519n,
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
                "value": 304054n,
              },
              "stx-to-receiver": {
                "type": 1,
                "value": 43068n,
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
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "398009950248756",
            },
            "new-stk": {
              "type": "uint",
              "value": "50250000",
            },
            "new-stx": {
              "type": "uint",
              "value": "49250000",
            },
            "stx-in": {
              "type": "uint",
              "value": "49000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "4892500",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15601990049751244",
            },
            "total-stk": {
              "type": "uint",
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "201511335012594",
            },
            "new-stk": {
              "type": "uint",
              "value": "99250000",
            },
            "new-stx": {
              "type": "uint",
              "value": "98250000",
            },
            "stx-in": {
              "type": "uint",
              "value": "98000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "4892500",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15798488664987406",
            },
            "total-stk": {
              "type": "uint",
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "101394169835234",
            },
            "new-stk": {
              "type": "uint",
              "value": "197250000",
            },
            "new-stx": {
              "type": "uint",
              "value": "196250000",
            },
            "stx-in": {
              "type": "uint",
              "value": "196000000",
            },
            "stx-to-grad": {
              "type": "uint",
              "value": "4892500",
            },
            "tokens-out": {
              "type": "uint",
              "value": "15898605830164766",
            },
            "total-stk": {
              "type": "uint",
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
            },
          },
        },
      }
    `);
  });
});

describe("get-out", () => {
  it("should give the relevant data for a given token sell - min fee is 3 sats Rafa", () => {
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
              "value": "3",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "16000000050000000",
            },
            "new-stk": {
              "type": "uint",
              "value": "1249999",
            },
            "new-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "3",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "16000000100000000",
            },
            "new-stk": {
              "type": "uint",
              "value": "1249999",
            },
            "new-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "3",
            },
            "ft-balance": {
              "type": "uint",
              "value": "16000000000000000",
            },
            "k": {
              "type": "uint",
              "value": "20000000000000000000000",
            },
            "new-ft": {
              "type": "uint",
              "value": "16000000200000000",
            },
            "new-stk": {
              "type": "uint",
              "value": "1249999",
            },
            "new-stx": {
              "type": "uint",
              "value": "250000",
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
              "value": "1250000",
            },
            "total-stx": {
              "type": "uint",
              "value": "250000",
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
    expect(result).toStrictEqual(responseErrorCV(uintCV(1001)));
  });
});
