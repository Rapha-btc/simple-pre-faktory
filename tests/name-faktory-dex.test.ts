import { describe, expect, it } from "vitest";
import {
  deployer,
  deployStubToken,
  getSbtc,
  stubTokenContract,
  token,
} from "./helpers";
import {
  cvToJSON,
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

  it.skip("only allows buying when the contract is open for sales", () => {
    // Should probably test this after testing the actual bonding stuff
  });

  it("should transfer 60% of the calculated fee minus to the FEE-RECEIVER", () => {
    getSbtc(address1);
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
    getSbtc(address1);
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
    getSbtc(address1);
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
    getSbtc(address1);
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
    getSbtc(address1);
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
    getSbtc(address1);
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
          "raw_value": "0x0c000000090366656501000000000000000000000000000007d0026674061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790a66742d62616c616e63650100000000000000000040b66354a6e47c056d616b6572051a7321b74e2b6a7e949e6c4ad313035b1665095017046f70656e030b7374782d62616c616e63650100000000000000000000000000017ed00a746f6b656e732d6f7574010000000000000000000657818adb1b8404747970650d00000003627579047573747801000000000000000000000000000186a0",
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
                "value": 18214936247723132n,
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
                "value": 1785063752276868n,
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
});

describe("when the dex completes the bonding curve", () => {
  // There seems to be a bug completing the bonding curve when the sbtc in is bigger than the target sbtc
  it.skip("should transfer a premium percentage to the 'FAKTORY' address", () => {
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

    const { result, events } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(2_000_000)],
      address3
    );

    expect(result).toEqual(responseOkCV(trueCV()));
    // TODO: Assert that the premium is sent to Faktory
  });
});
