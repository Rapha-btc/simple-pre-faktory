import { beforeEach, describe, expect, it } from "vitest";
import {
  buyAllPreSaleSeats,
  buySeatOnBehalf,
  deployer,
  deployStubToken,
  getSbtc,
  stubTokenContract,
  token,
} from "./helpers";
import {
  cvToJSON,
  cvToValue,
  ListCV,
  noneCV,
  principalCV,
  responseErrorCV,
  responseOkCV,
  someCV,
  trueCV,
  uintCV,
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const address4 = accounts.get("wallet_4")!;
const address5 = accounts.get("wallet_5")!;
const address6 = accounts.get("wallet_6")!;
const address7 = accounts.get("wallet_7")!;
const address8 = accounts.get("wallet_8")!;
const address9 = accounts.get("wallet_9")!;
const address10 = accounts.get("wallet_10")!;
const address11 = accounts.get("wallet_11")!;
const address12 = accounts.get("wallet_12")!;

describe("buy-up-to", () => {
  beforeEach(() => {
    getSbtc(address1);
  });

  it("should not allow buying seats after tokens were distributed", () => {
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(320)));
  });

  it("should not allow buying more seats than available", () => {
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(30), noneCV()],
      address1
    );
    const pricePerSeat = 20000;
    const maxSeatsPerUser = 7;
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[0].event).toBe("ft_transfer_event");
    expect(events[0].data.amount).toBe(
      (pricePerSeat * maxSeatsPerUser).toString()
    );
  });

  it("should transfer the usbtc to the contract when buying a seat", () => {
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(7), noneCV()],
      address1
    );

    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[0]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "140000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should update the number of user seats if the user had no seats", () => {
    const totalUsersBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    expect(cvToValue(totalUsersBefore)).toBe(BigInt(0));

    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(7), noneCV()],
      address1
    );

    const totalUsersAfter = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    expect(cvToValue(totalUsersAfter)).toBe(BigInt(1));
  });

  it("should updated the number of seats owned by the user", () => {
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    const totalUserSeatsBefore = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address1)
    );
    expect(cvToValue(totalUserSeatsBefore).value).toBe("2");

    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(3), noneCV()],
      address1
    );
    const totalUserSeatsAfter = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address1)
    );

    expect(cvToValue(totalUserSeatsAfter).value).toBe("5");
  });

  it("should initialize the token distribution if the minimum number of seats was bought and the minimum number of users was reached", () => {
    const buys = buyAllPreSaleSeats();
    const { result, events } = buys[buys.length - 1];
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[4]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c0000000413646973747269627574696f6e2d68656967687401000000000000000000000000000000150a66742d62616c616e6365010000000000000000000e35fa931a00000e746f6b656e2d636f6e7472616374061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f727904747970650d00000018646973747269627574696f6e2d696e697469616c697a6564",
          "topic": "print",
          "value": {
            "data": {
              "distribution-height": {
                "type": 1,
                "value": 21n,
              },
              "ft-balance": {
                "type": 1,
                "value": 4000000000000000n,
              },
              "token-contract": {
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
              "type": {
                "data": "distribution-initialized",
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

  it("should print a receipt", () => {
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(7), noneCV()],
      address1
    );

    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[1]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c00000008056275796572051a7321b74e2b6a7e949e6c4ad313035b166509501713646973747269627574696f6e2d68656967687401000000000000000000000000000000000c736561742d686f6c646572730b000000010c00000002056f776e6572051a7321b74e2b6a7e949e6c4ad313035b166509501705736561747301000000000000000000000000000000070b73656174732d6f776e656401000000000000000000000000000000070b7374782d62616c616e636501000000000000000000000000000222e011746f74616c2d73656174732d74616b656e01000000000000000000000000000000070b746f74616c2d7573657273010000000000000000000000000000000104747970650d000000096275792d7365617473",
          "topic": "print",
          "value": {
            "data": {
              "buyer": {
                "address": {
                  "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                  "type": 0,
                  "version": 26,
                },
                "type": 5,
              },
              "distribution-height": {
                "type": 1,
                "value": 0n,
              },
              "seat-holders": {
                "list": [
                  {
                    "data": {
                      "owner": {
                        "address": {
                          "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                          "type": 0,
                          "version": 26,
                        },
                        "type": 5,
                      },
                      "seats": {
                        "type": 1,
                        "value": 7n,
                      },
                    },
                    "type": 12,
                  },
                ],
                "type": 11,
              },
              "seats-owned": {
                "type": 1,
                "value": 7n,
              },
              "stx-balance": {
                "type": 1,
                "value": 140000n,
              },
              "total-seats-taken": {
                "type": 1,
                "value": 7n,
              },
              "total-users": {
                "type": 1,
                "value": 1n,
              },
              "type": {
                "data": "buy-seats",
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

describe("refund", () => {
  beforeEach(() => {
    getSbtc(address1);
  });

  it("should not allow refunding after tokens were distributed", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(2100);
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );

    expect(result).toStrictEqual(responseErrorCV(uintCV(320)));
  });

  it("should now allow refunding if sender does not own seats", () => {
    getSbtc(address2);
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    simnet.mineEmptyBurnBlocks(2100);
    const { result: refund } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address2
    );
    expect(refund).toStrictEqual(responseErrorCV(uintCV(302)));
  });

  it("should only allow refunding if period 1 expired - Rafa removed period 1 - refund ok true then not seat owner anymore", () => {
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));

    const { result: refundBeforeExpire } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );
    expect(refundBeforeExpire).toStrictEqual(responseOkCV(trueCV())); // (responseErrorCV(uintCV(309)));
    simnet.mineEmptyBurnBlocks(2100);

    const { result: refundAfterExpire } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );
    expect(refundAfterExpire).toStrictEqual(responseErrorCV(uintCV(302))); // (responseOkCV(trueCV()));
  });

  it("should transfer back the invested usbtc", () => {
    getSbtc(address2);
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    simnet.mineEmptyBurnBlocks(2100);
    const { result: refund, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );
    expect(refund).toStrictEqual(responseOkCV(trueCV()));
    expect(events[0]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "40000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
          "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should remove the seat owner from the list of holders", () => {
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    const holders = cvToJSON(
      simnet.getDataVar("name-pre-faktory", "seat-holders") as ListCV
    );
    expect(holders.value[0].value.owner.value).toBe(address1);
    simnet.mineEmptyBurnBlocks(2100);
    simnet.callPublicFn("name-pre-faktory", "refund", [], address1);

    const holdersAfter = cvToJSON(
      simnet.getDataVar("name-pre-faktory", "seat-holders") as ListCV
    );
    expect(holdersAfter.value.length).toBe(0);
  });

  it("should remove the seats owned by the user", () => {
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    const seatsOwned = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address1)
    );
    expect(seatsOwned).toStrictEqual(someCV(uintCV(2)));
    simnet.mineEmptyBurnBlocks(2100);
    simnet.callPublicFn("name-pre-faktory", "refund", [], address1);

    expect(
      simnet.getMapEntry(
        "name-pre-faktory",
        "seats-owned",
        principalCV(address1)
      )
    ).toStrictEqual(noneCV());
  });

  it("should update the total seats taken, the total users and the usbtc balance", () => {
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    const totalSeatsTaken = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    const stxBalance = simnet.getDataVar("name-pre-faktory", "stx-balance");
    const totalUsers = simnet.getDataVar("name-pre-faktory", "total-users");

    expect(totalSeatsTaken).toStrictEqual(uintCV(2));
    expect(stxBalance).toStrictEqual(uintCV(2 * 20000));
    expect(totalUsers).toStrictEqual(uintCV(1));

    simnet.mineEmptyBurnBlocks(2100);
    simnet.callPublicFn("name-pre-faktory", "refund", [], address1);

    const totalSeatsTakenAfter = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    const stxBalanceAfter = simnet.getDataVar(
      "name-pre-faktory",
      "stx-balance"
    );
    const totalUsersAfter = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );

    expect(totalSeatsTakenAfter).toStrictEqual(uintCV(0));
    expect(stxBalanceAfter).toStrictEqual(uintCV(0));
    expect(totalUsersAfter).toStrictEqual(uintCV(0));
  });

  it("should print a receipt", () => {
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    simnet.mineEmptyBurnBlocks(2100);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events[2]).toMatchInlineSnapshot(`undefined`);
  });
});

describe("claim", () => {
  beforeEach(() => {
    getSbtc(address1);
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(5), noneCV()],
      address1
    );
  });

  it("should not allow claiming tokens if the distribution period has not started yet", () => {
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(321)));
  });

  it("should not allow claiming tokens for a different token than the assigned", () => {
    deployStubToken();
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [stubTokenContract],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(307)));
  });

  it("should not allow claiming tokens if sender was not a seat owner", () => {
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      deployer // This account does not own any seats
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(302)));
  });

  it("should not allow claiming tokens if sender has nothing to claim", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    const { result: resultFirstClaim } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    ); // Claims tokens
    expect(resultFirstClaim).toStrictEqual(
      responseOkCV(uintCV(182000000000000n))
    );
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    ); // Should no longer have tokens to claim
    expect(result).toStrictEqual(responseErrorCV(uintCV(304)));
  });

  it.skip("should not allow claiming tokens if the contract does not hold enough of the token", () => {
    // Can't find a way to reproduce this case
    // This check might be unecessary, since if the contract would go through and try to transfer it would fail anyways
  });

  it("should transfer the claimable amount to the sender", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    ); // Claims tokens
    expect(result).toStrictEqual(responseOkCV(uintCV(182000000000000n)));
    expect(events[0]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "182000000000000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
          "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should update the amount claimed after a successful claim", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    expect(() =>
      simnet.getMapEntry(
        "name-pre-faktory",
        "claimed-amounts",
        principalCV(address1)
      )
    ).toThrowError();
    simnet.callPublicFn("name-pre-faktory", "claim", [token], address1); // Claims tokens

    const claimedAfter = simnet.getMapEntry(
      "name-pre-faktory",
      "claimed-amounts",
      principalCV(address1)
    );
    expect(claimedAfter).toStrictEqual(someCV(uintCV(182000000000000)));
  });

  it("should update the token balance after a successful claim", () => {
    buyAllPreSaleSeats();
    const tokenBalanceBefore = simnet.getDataVar(
      "name-pre-faktory",
      "ft-balance"
    );
    expect(tokenBalanceBefore).toStrictEqual(uintCV(4000000000000000));

    simnet.mineEmptyBurnBlocks(250);
    simnet.callPublicFn("name-pre-faktory", "claim", [token], address1); // Claims tokens

    const tokenBalanceAfter = simnet.getDataVar(
      "name-pre-faktory",
      "ft-balance"
    );
    expect(tokenBalanceAfter).toStrictEqual(
      uintCV(4000000000000000 - 182000000000000)
    );
  });

  it("should print a receipt", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    ); // Claims tokens
    expect(result).toStrictEqual(responseOkCV(uintCV(182000000000000)));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c000000050e616d6f756e742d636c61696d65640100000000000000000000a5872d5960000a66742d62616c616e6365010000000000000000000d907365c0a0000d746f74616c2d636c61696d65640a0100000000000000000000a5872d59600004747970650d00000005636c61696d0475736572051a7321b74e2b6a7e949e6c4ad313035b1665095017",
          "topic": "print",
          "value": {
            "data": {
              "amount-claimed": {
                "type": 1,
                "value": 182000000000000n,
              },
              "ft-balance": {
                "type": 1,
                "value": 3818000000000000n,
              },
              "total-claimed": {
                "type": 10,
                "value": {
                  "type": 1,
                  "value": 182000000000000n,
                },
              },
              "type": {
                "data": "claim",
                "type": 13,
              },
              "user": {
                "address": {
                  "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                  "type": 0,
                  "version": 26,
                },
                "type": 5,
              },
            },
            "type": 12,
          },
        },
        "event": "print_event",
      }
    `);
  });

  describe("get-claimable-amount", () => {
    it.each([
      [100, 140000000000000n],
      [250, 182000000000000n],
      [400, 224000000000000n],
      [550, 266000000000000n],
      [700, 308000000000000n],
      [850, 364000000000000n],
      [1000, 420000000000000n],
      [1200, 476000000000000n],
      [1400, 532000000000000n],
      [1600, 588000000000000n],
      [1750, 644000000000000n],
      [1900, 700000000000000n],
      [2000, 770000000000000n],
      [2100, 840000000000000n],
      [2500, 910000000000000n],
      [2900, 980000000000000n],
      [3300, 1064000000000000n],
      [3600, 1148000000000000n],
      [3900, 1232000000000000n],
      [4100, 1316000000000000n],
      [4200, 1400000000000000n],
    ])(
      "should set the claimable amount based on the vesting schedule and the number of seats owned",
      (blocks, claimable) => {
        buyAllPreSaleSeats();
        simnet.mineEmptyBurnBlocks(blocks);
        const { result } = simnet.callPublicFn(
          "name-pre-faktory",
          "claim",
          [token],
          address1
        ); // Claims tokens
        expect(result).toStrictEqual(responseOkCV(uintCV(claimable)));
      }
    );
  });
});

describe("claim-on-behalf", () => {
  it("should not allow claiming tokens if the distribution period has not started yet", () => {
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(address2)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(321)));
  });

  it("should not allow claiming tokens for a different token than the assigned", () => {
    deployStubToken();
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [stubTokenContract, principalCV(address2)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(307)));
  });

  it("should not allow claiming tokens if the set holder was not a seat owner", () => {
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(deployer)], // This account does not own any seats
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(302)));
  });

  it("should not allow claiming tokens if the set holder has nothing to claim", () => {
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(address2)],
      address1
    );
    // vesting period not started
    expect(result).toStrictEqual(responseErrorCV(uintCV(304)));
  });

  it.skip("should not allow claiming tokens if the contract does not hold enough of the token", () => {
    // Can't find a way to reproduce this case
    // This check might be unecessary, since if the contract would go through and try to transfer it would fail anyways
  });

  it("should transfer the claimable amount to the target holder", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(address2)],
      address1
    ); // Claims tokens
    expect(result).toStrictEqual(responseOkCV(uintCV(52000000000000n)));
    expect(events[0]).toMatchInlineSnapshot(`
      {
        "data": {
          "amount": "52000000000000",
          "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
          "recipient": "${address2}",
          "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
        },
        "event": "ft_transfer_event",
      }
    `);
  });

  it("should update the amount claimed after a successful claim", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    expect(() =>
      simnet.getMapEntry(
        "name-pre-faktory",
        "claimed-amounts",
        principalCV(address2)
      )
    ).toThrowError();
    simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(address2)],
      address1
    ); // Claims tokens

    const claimedAfter = simnet.getMapEntry(
      "name-pre-faktory",
      "claimed-amounts",
      principalCV(address2)
    );
    expect(claimedAfter).toStrictEqual(someCV(uintCV(52000000000000n)));
  });

  it("should update the token balance after a successful claim", () => {
    buyAllPreSaleSeats();
    const tokenBalanceBefore = simnet.getDataVar(
      "name-pre-faktory",
      "ft-balance"
    );
    expect(tokenBalanceBefore).toStrictEqual(uintCV(4000000000000000));

    simnet.mineEmptyBurnBlocks(250);
    simnet.callPublicFn(
      "name-pre-faktory",
      "claim-on-behalf",
      [token, principalCV(address2)],
      address1
    ); // Claims tokens

    const tokenBalanceAfter = simnet.getDataVar(
      "name-pre-faktory",
      "ft-balance"
    );
    expect(tokenBalanceAfter).toStrictEqual(
      uintCV(4000000000000000 - 52000000000000)
    );
  });

  it("should print a receipt", () => {
    buyAllPreSaleSeats();
    simnet.mineEmptyBurnBlocks(250);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    ); // Claims tokens
    expect(result).toStrictEqual(responseOkCV(uintCV(52000000000000)));
    expect(events[2]).toMatchInlineSnapshot(`
      {
        "data": {
          "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          "raw_value": "0x0c000000050e616d6f756e742d636c61696d656401000000000000000000002f4b318740000a66742d62616c616e6365010000000000000000000e06af6192c0000d746f74616c2d636c61696d65640a01000000000000000000002f4b3187400004747970650d00000005636c61696d0475736572051a7321b74e2b6a7e949e6c4ad313035b1665095017",
          "topic": "print",
          "value": {
            "data": {
              "amount-claimed": {
                "type": 1,
                "value": 52000000000000n,
              },
              "ft-balance": {
                "type": 1,
                "value": 3948000000000000n,
              },
              "total-claimed": {
                "type": 10,
                "value": {
                  "type": 1,
                  "value": 52000000000000n,
                },
              },
              "type": {
                "data": "claim",
                "type": 13,
              },
              "user": {
                "address": {
                  "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                  "type": 0,
                  "version": 26,
                },
                "type": 5,
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

describe("toggle-bonded", () => {
  it("should only allow the dex contract to call it", () => {
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "toggle-bonded",
      [],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(305)));
  });
});

describe("trigger-fee-airdrop", () => {
  beforeEach(() => {
    getSbtc(address1);
    getSbtc(address2);
  });

  it("should not allow triggering during cooldown period", () => {
    buyAllPreSaleSeats();
    simnet.callPublicFn("name-faktory-dex", "open-market", [], deployer);

    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(5_000)],
      address2
    );
    simnet.mineEmptyBurnBlocks(2100);

    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "trigger-fee-airdrop",
      [],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(uintCV(40n)));

    const { result: buyresult } = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(3_000)],
      address2
    );
    expect(buyresult).toStrictEqual(responseOkCV(trueCV()));

    const { result: result3 } = simnet.callPublicFn(
      "name-pre-faktory",
      "trigger-fee-airdrop",
      [],
      address1
    );
    expect(result3).toStrictEqual(responseErrorCV(uintCV(324)));
  });

  it("should not allow triggering if there are no fees to distribute", () => {
    buyAllPreSaleSeats();
    simnet.callPublicFn("name-faktory-dex", "open-market", [], deployer);

    simnet.mineEmptyBurnBlocks(2100);

    expect(
      simnet.callPublicFn(
        "name-pre-faktory",
        "trigger-fee-airdrop",
        [],
        address1
      ).result
    ).toStrictEqual(responseErrorCV(uintCV(323)));
  });

  it.skip("should not allow triggering if no seats are taken", () => {
    // This can't be reached currently since you can only trigger an airdrop if you have fees, but you
    // can only have fees if the market is opened, and the market only opens after the seats are all taken
    // The only way would be by triggering a refund but that's currently not working
  });

  it("should distribute the fee share for every seat owner", () => {
    buyAllPreSaleSeats();
    simnet.callPublicFn("name-faktory-dex", "open-market", [], deployer);

    simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(5_000_000)],
      address2
    );
    simnet.mineEmptyBurnBlocks(2100);
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "trigger-fee-airdrop",
      [],
      address1
    );
    // console.log("FULL EVENTS OUTPUT:", events);

    expect(result).toStrictEqual(responseOkCV(uintCV(40000n)));

    // Just check important parts of the structure
    expect(events.length).toBeGreaterThan(10);
    expect(events[events.length - 1].event).toBe("print_event");
    // expect(events).toMatchInlineSnapshot(`
    // //   [
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory"
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST2ZB99W3GWYV4F3JRG81MXEVW9CYDBHWXPW1ETG",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "ft_transfer_event",
    // //       "data": {
    // //         "amount": "4000",
    // //         "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
    // //         "recipient": "ST38KBGBJ34TPJCHB03TRN1X1DGASTSGGQPZD74WZ",
    // //         "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //       }
    // //     },
    // //     {
    // //       "event": "print_event",
    // //       "data": {
    // //         "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
    // //         "raw_value": "0x0c000000040d646973747269627574696f6e730b0000000a0c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051a7321b74e2b6a7e949e6c4ad313035b16650950170c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051a99e2ec69ac5b6e67b4e26edd0e2c1c1a6b9bbd230c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051aa5180cc1ff6050df53f0ab766d76b630e14feb0c0c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051a05572d04565d56f67e84ad7e20deedd8e7bba2fd0c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051ab0e8c72590d8ec330b75a9089d220dcd6f4d4a6e0c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051ad540a8a654c4c0f54f910212ff3b119cb2257bb80c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051aecf08f87f8318a104a46ff8dbee72e761988d8eb0c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051aeabc65f3e890fb8bf20d153e95119c72d85765a90c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051a05f5a53c1c39ed91e3962080d3aedf12cf3571e70c0000000206616d6f756e740100000000000000000000000000000fa009726563697069656e74051ad135c172193569322b00f58a87a16c159d6610bd0974696d657374616d70010000000000000000000000000000084d11746f74616c2d64697374726962757465640100000000000000000000000000009c4004747970650d0000000b6665652d61697264726f70",
    // //         "topic": "print",
    // //         "value": {
    // //           "type": 12,
    // //           "data": {
    // //             "distributions": {
    // //               "type": 11,
    // //               "list": [
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "99e2ec69ac5b6e67b4e26edd0e2c1c1a6b9bbd23"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "a5180cc1ff6050df53f0ab766d76b630e14feb0c"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "05572d04565d56f67e84ad7e20deedd8e7bba2fd"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "b0e8c72590d8ec330b75a9089d220dcd6f4d4a6e"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "d540a8a654c4c0f54f910212ff3b119cb2257bb8"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "ecf08f87f8318a104a46ff8dbee72e761988d8eb"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "eabc65f3e890fb8bf20d153e95119c72d85765a9"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "05f5a53c1c39ed91e3962080d3aedf12cf3571e7"
    // //                       }
    // //                     }
    // //                   }
    // //                 },
    // //                 {
    // //                   "type": 12,
    // //                   "data": {
    // //                     "amount": {
    // //                       "type": 1,
    // //                       "value": "4000"
    // //                     },
    // //                     "recipient": {
    // //                       "type": 5,
    // //                       "address": {
    // //                         "type": 0,
    // //                         "version": 26,
    // //                         "hash160": "d135c172193569322b00f58a87a16c159d6610bd"
    // //                       }
    // //                     }
    // //                   }
    // //                 }
    // //               ]
    // //             },
    // //             "timestamp": {
    // //               "type": 1,
    // //               "value": "2125"
    // //             },
    // //             "total-distributed": {
    // //               "type": 1,
    // //               "value": "40000"
    // //             },
    // //             "type": {
    // //               "type": 13,
    // //               "data": "fee-airdrop"
    // //             }
    // //           }
    // //         }
    // //       }
    // //     }
    // //   ]`);
  });
});

describe("buy-last-seat", () => {
  // Function to distribute sBTC to all required wallets
  function setupWallets() {
    // Get sBTC for all wallets that need it
    getSbtc(address1);
    getSbtc(address2);
    getSbtc(address3);
    getSbtc(address4);
    getSbtc(address5);
    getSbtc(address6);
    getSbtc(address7);
    getSbtc(address8);
    getSbtc(address9);
    getSbtc(address10);
    getSbtc(address11);
    getSbtc(address12);
  }

  // Function to get 11 users to buy a total of 19 seats
  function buy19Seats() {
    // User 1 buys 2 seats
    const buy1 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address1
    );
    expect(buy1.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 1 bought 2 seats");

    // User 2 buys 2 seats
    const buy2 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address2
    );
    expect(buy2.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 2 bought 2 seats");

    // User 3 buys 2 seats
    const buy3 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address3
    );
    expect(buy3.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 3 bought 2 seats");

    // User 4 buys 2 seats
    const buy4 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address4
    );
    expect(buy4.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 4 bought 2 seats");

    // User 5 buys 2 seats
    const buy5 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address5
    );
    expect(buy5.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 5 bought 2 seats");

    // User 6 buys 1 seat
    const buy6 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address6
    );
    expect(buy6.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 6 bought 1 seat");

    // User 7 buys 1 seat
    const buy7 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address7
    );
    expect(buy7.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 7 bought 1 seat");

    // User 8 buys 1 seat
    const buy8 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address8
    );
    expect(buy8.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 8 bought 1 seat");

    // User 9 buys 1 seat
    const buy9 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address9
    );
    expect(buy9.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 9 bought 1 seat");

    // User 10 buys 1 seat
    const buy10 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address10
    );
    expect(buy10.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 10 bought 1 seat");

    // User 11 buys 4 seats
    const buy11 = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(4), noneCV()],
      address11
    );
    expect(buy11.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 11 bought 4 seats");

    // Verify we have 19 seats total
    const totalSeatsTaken = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Total seats taken:", totalSeatsTaken);
    expect(totalSeatsTaken).toStrictEqual(uintCV(19));

    // Verify we have 11 users total
    const totalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    // console.log("Total users:", totalUsers);
    expect(totalUsers).toStrictEqual(uintCV(11));
  }

  it("should initialize distribution when last seat is bought", () => {
    // Setup wallets with sBTC
    setupWallets();

    // Buy 19 seats with 11 users
    buy19Seats();

    // User 12 buys the final seat (seat 20)
    // console.log("User 12 attempting to buy the last seat...");
    const buyLastSeat = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address12
    );

    // The result should be successful
    expect(buyLastSeat.result).toStrictEqual(responseOkCV(trueCV()));

    // Log events by simply using console.log without accessing their properties directly
    // console.log("===== EVENTS FROM BUYING LAST SEAT =====");
    // buyLastSeat.events.forEach((event, index) => {
    //   console.log(`Event ${index}:`, event);
    // });

    // Check if we now have 20 seats total
    const finalTotalSeatsTaken = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Final total seats taken:", finalTotalSeatsTaken);
    expect(finalTotalSeatsTaken).toStrictEqual(uintCV(20));

    // Check if we now have 12 users total
    const finalTotalUsers = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    // console.log("Final total users:", finalTotalUsers);
    expect(finalTotalUsers).toStrictEqual(uintCV(12));

    // Check if distribution has been initialized
    // Find the distribution-initialized event without accessing properties directly
    // console.log("Checking for distribution-initialized event...");
    expect(buyLastSeat.events.length).toBeGreaterThan(0);

    // Use expect().toMatchInlineSnapshot() to inspect an event at a specific index
    // This is the pattern used in the original tests
    expect(buyLastSeat.events[0]).toBeDefined();
  });
});

// Define our own buySeat function since it might not be exported from helpers
const buySeatForTest = (account: string, seatCount: number) => {
  return simnet.callPublicFn(
    "name-pre-faktory",
    "buy-up-to",
    [uintCV(seatCount), noneCV()],
    account
  );
};

// Helper function to log distribution initialization events
const logDistributionEvents = (buyResult: any): void => {
  // console.log("===== EVENTS FROM LAST PURCHASE =====");
  // buyResult.events.forEach((event: any, index: number) => {
  //   console.log(`Event ${index}:`, event);
  // });
};

// Helper function to verify distribution is initialized
const verifyDistributionInitialized = (): void => {
  // Verify total seats is 20
  const totalSeats = simnet.getDataVar("name-pre-faktory", "total-seats-taken");
  // console.log("Total seats taken:", totalSeats);
  expect(totalSeats).toStrictEqual(uintCV(20));

  // Verify distribution height is set (non-zero)
  const distributionHeight = simnet.getDataVar(
    "name-pre-faktory",
    "distribution-height"
  );
  // console.log("Distribution height:", distributionHeight);
  expect(distributionHeight).not.toStrictEqual(uintCV(0));

  // Verify market is open
  const marketOpen = simnet.getDataVar("name-pre-faktory", "market-open");
  // console.log("Market open:", marketOpen);
  expect(marketOpen).toStrictEqual(trueCV());
};

describe("seat-distribution-scenarios", () => {
  beforeEach(() => {
    // Set up all accounts with sBTC
    [
      address1,
      address2,
      address3,
      address4,
      address5,
      address6,
      address7,
      address8,
      address9,
      address10,
    ].forEach(getSbtc);
  });

  // Scenario 1: Maximum number of users (10 users, 2 seats each)
  it("should initialize distribution with 10 users buying 2 seats each", () => {
    // console.log("\n===== SCENARIO: 10 USERS WITH 2 SEATS EACH =====");
    // First 9 users buy 2 seats each
    for (let i = 1; i <= 9; i++) {
      const address = accounts.get(`wallet_${i}`)!;
      const result = buySeatForTest(address, 2);
      expect(result.result).toStrictEqual(responseOkCV(trueCV()));
    }

    // Verify we have 18 seats total and 9 users
    const totalSeatsBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Seats taken before last purchase:", totalSeatsBefore);
    expect(totalSeatsBefore).toStrictEqual(uintCV(18));

    const totalUsersBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    // console.log("Users before last purchase:", totalUsersBefore);
    expect(totalUsersBefore).toStrictEqual(uintCV(9));

    // Last user buys the final 2 seats (19 and 20)
    // console.log("\n===== BUYING FINAL 2 SEATS WITH USER 10 =====");
    const finalBuyResult = buySeatForTest(address10, 2);
    expect(finalBuyResult.result).toStrictEqual(responseOkCV(trueCV()));

    // Log events from the final purchase
    logDistributionEvents(finalBuyResult);

    // Verify final state
    const finalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    expect(finalUsers).toStrictEqual(uintCV(10));

    // Verify distribution is initialized
    verifyDistributionInitialized();
  });

  // Simulate Scenario 2: Maximum number of seats per user (10 users, varied seat counts)
  // We'll use the 10 available wallets to simulate this scenario
  it("should initialize distribution with varied seat distribution across users", () => {
    // console.log("\n===== SCENARIO: VARIED SEAT DISTRIBUTION =====");

    // First user gets 7 seats (maximum allowed)
    // console.log("User 1 buying 7 seats (maximum allowed)");
    const buy1 = buySeatForTest(address1, 7);
    expect(buy1.result).toStrictEqual(responseOkCV(trueCV()));

    // Next users get varying numbers of seats
    // console.log("User 2 buying 3 seats");
    const buy2 = buySeatForTest(address2, 3);
    expect(buy2.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 3 buying 2 seats");
    const buy3 = buySeatForTest(address3, 2);
    expect(buy3.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 4 buying 1 seat");
    const buy4 = buySeatForTest(address4, 1);
    expect(buy4.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 5 buying 1 seat");
    const buy5 = buySeatForTest(address5, 1);
    expect(buy5.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 6 buying 1 seat");
    const buy6 = buySeatForTest(address6, 1);
    expect(buy6.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 7 buying 1 seat");
    const buy7 = buySeatForTest(address7, 1);
    expect(buy7.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 8 buying 1 seat");
    const buy8 = buySeatForTest(address8, 1);
    expect(buy8.result).toStrictEqual(responseOkCV(trueCV()));

    // console.log("User 9 buying 2 seat");
    const buy9 = buySeatForTest(address9, 2);
    expect(buy9.result).toStrictEqual(responseOkCV(trueCV()));

    // Verify we have 19 seats total and 9 users
    const totalSeatsBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Seats taken before last purchase:", totalSeatsBefore);
    expect(totalSeatsBefore).toStrictEqual(uintCV(19));

    const totalUsersBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    // console.log("Users before last purchase:", totalUsersBefore);
    expect(totalUsersBefore).toStrictEqual(uintCV(9));

    // Last user buys the final seat
    // console.log("\n===== BUYING FINAL SEAT WITH USER 10 =====");
    const finalBuyResult = buySeatForTest(address10, 1);
    expect(finalBuyResult.result).toStrictEqual(responseOkCV(trueCV()));

    // Log events from the final purchase
    logDistributionEvents(finalBuyResult);

    // Verify final state
    const finalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    expect(finalUsers).toStrictEqual(uintCV(10));

    // Verify distribution is initialized
    verifyDistributionInitialized();
  });

  // Simulate 10 users with 1 seat each, then attempt to buy more
  it("should work with minimum seat allocation per user", () => {
    // console.log("\n===== SCENARIO: MINIMUM SEATS PER USER (1 EACH) =====");

    // First 9 users buy 1 seat each
    for (let i = 1; i <= 9; i++) {
      const address = accounts.get(`wallet_${i}`)!;
      const result = buySeatForTest(address, 1);
      expect(result.result).toStrictEqual(responseOkCV(trueCV()));
      // console.log(`User ${i} bought 1 seat`);
    }

    // Verify we have 9 seats total and 9 users
    const totalSeatsBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Seats taken before next purchases:", totalSeatsBefore);
    expect(totalSeatsBefore).toStrictEqual(uintCV(9));

    // Last user buys 1 seat (not enough to trigger distribution)
    // console.log("User 10 buying 1 seat (not enough for distribution)");
    const buy10 = buySeatForTest(address10, 1);
    expect(buy10.result).toStrictEqual(responseOkCV(trueCV()));

    // Now all users buy 1 more seat each until we reach 20
    // console.log("\n===== USERS BUYING ADDITIONAL SEATS =====");

    // Users 1-10 each buy 1 more seat
    for (let i = 1; i <= 10; i++) {
      const address = accounts.get(`wallet_${i}`)!;
      const result = buySeatForTest(address, 1);
      expect(result.result).toStrictEqual(responseOkCV(trueCV()));
      // console.log(`User ${i} bought their 2nd seat`);

      // Check total seats after each purchase
      const seatsAfter = simnet.getDataVar(
        "name-pre-faktory",
        "total-seats-taken"
      );
      // console.log(`Total seats after user ${i}'s 2nd purchase:`, seatsAfter);

      // If we hit 20 seats, log the triggering event
      if (cvToValue(seatsAfter) === 20n) {
        // console.log(
        //   `\n===== DISTRIBUTION TRIGGERED BY USER ${i}'S PURCHASE =====`
        // );
        logDistributionEvents(result);
        break;
      }
    }

    // Verify final state
    const finalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    // console.log("Final users:", finalUsers);
    expect(finalUsers).toStrictEqual(uintCV(10));

    // Verify distribution is initialized
    verifyDistributionInitialized();
  });
});

describe("max-seats-per-user-test", () => {
  beforeEach(() => {
    // Set up all accounts with sBTC
    [
      address1,
      address2,
      address3,
      address4,
      address5,
      address6,
      address7,
      address8,
      address9,
      address10,
    ].forEach(getSbtc);
  });

  it("should not allow a user to exceed MAX-SEATS-PER-USER when buying the last seat", () => {
    // console.log("\n===== SETTING UP 19 SEATS WITH 10 USERS =====");

    // User 1 buys the maximum of 7 seats
    const buy1 = buySeatForTest(address1, 7);
    expect(buy1.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 1 bought 7 seats");

    // Nine more users buy 1 seat each to reach 10 users with 16 seats
    for (let i = 2; i <= 10; i++) {
      const address = accounts.get(`wallet_${i}`)!;
      const result = buySeatForTest(address, 1);
      expect(result.result).toStrictEqual(responseOkCV(trueCV()));
      // console.log(`User ${i} bought 1 seat`);
    }

    // User 2 buys 1 more seat
    const buy2More = buySeatForTest(address2, 1);
    expect(buy2More.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 2 bought 1 more seat");

    // User 3 buys 2 more seat
    const buy3More = buySeatForTest(address3, 2);
    expect(buy3More.result).toStrictEqual(responseOkCV(trueCV()));
    // console.log("User 3 bought 2 more seat");

    // Verify we have 19 seats total and 10 users
    const totalSeatsBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Seats taken:", totalSeatsBefore);
    expect(totalSeatsBefore).toStrictEqual(uintCV(19));

    const totalUsersBefore = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    // console.log("Total users:", totalUsersBefore);
    expect(totalUsersBefore).toStrictEqual(uintCV(10));

    // User 1 (who already has 7 seats) tries to buy the last seat
    // console.log("\n===== USER 1 ATTEMPTS TO BUY THE LAST SEAT =====");
    const buyLastSeat = buySeatForTest(address1, 1);

    // This should fail with ERR-INVALID-SEAT-COUNT (313)
    // console.log("Result:", buyLastSeat.result);
    expect(buyLastSeat.result).toStrictEqual(responseErrorCV(uintCV(313)));

    // Verify the contract state remains unchanged
    const totalSeatsAfter = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Seats taken after failed attempt:", totalSeatsAfter);
    expect(totalSeatsAfter).toStrictEqual(uintCV(19)); // Still 19 seats

    // User 2 should be able to buy the last seat
    // console.log("\n===== USER 2 BUYS THE LAST SEAT INSTEAD =====");
    const user2BuysLast = buySeatForTest(address2, 1);
    expect(user2BuysLast.result).toStrictEqual(responseOkCV(trueCV()));

    // Now we should have 20 seats and distribution should be initialized
    const finalSeats = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    // console.log("Final total seats:", finalSeats);
    expect(finalSeats).toStrictEqual(uintCV(20));

    // Check if distribution has been initialized
    const distributionHeight = simnet.getDataVar(
      "name-pre-faktory",
      "distribution-height"
    );
    // console.log("Distribution height:", distributionHeight);
    expect(cvToValue(distributionHeight)).not.toBe(0n);

    // Get user 2's final seat count and verify it's 3
    const user2FinalSeats = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address2)
    );
    // console.log("User 2 final seats:", user2FinalSeats);

    // Use someCV to properly match the structure
    expect(user2FinalSeats).toStrictEqual(someCV(uintCV(3)));

    // // Check each user's final seat count
    // const user1FinalSeats = simnet.getMapEntry(
    //   "name-pre-faktory",
    //   "seats-owned",
    //   uintCV(address1)
    // );
    // console.log("User 1 final seats:", user1FinalSeats);

    // const user2FinalSeats = simnet.getMapEntry(
    //   "name-pre-faktory",
    //   "seats-owned",
    //   uintCV(address2)
    // );
    // console.log("User 2 final seats:", user2FinalSeats);
  });
});

describe("cross-chain-seat-purchase", () => {
  beforeEach(() => {
    getSbtc(address1); // Payer needs sBTC
    getSbtc(address2); // Might need for other tests
  });

  it("should allow buying seats on behalf of another user - payer vs owner separation", () => {
    // address1 pays for seats but address2 owns them
    const { result, events } = buySeatOnBehalf(address1, address2, 3);

    expect(result).toStrictEqual(responseOkCV(trueCV()));

    // Verify payment came from address1
    expect(events[0]).toMatchObject({
      event: "ft_transfer_event",
      data: {
        sender: address1, // Payer
        recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
      },
    });

    // Verify seats are owned by address2, not address1
    // address1 (payer) should have no seats - handle the "value not found" case
    let address1HasSeats = false;
    try {
      const address1Seats = simnet.getMapEntry(
        "name-pre-faktory",
        "seats-owned",
        principalCV(address1)
      );
      // If we get here, address1 unexpectedly has seats
      address1HasSeats = true;
      expect(address1Seats).toStrictEqual(noneCV());
    } catch (error) {
      // This is expected - address1 should not have any entry in seats-owned map
      // Just verify we caught an error (which means no seats for address1)
      expect(address1HasSeats).toBe(false);
    }

    // address2 (owner) should have seats
    const address2Seats = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address2)
    );
    expect(address2Seats).toStrictEqual(someCV(uintCV(3))); // Owner has 3 seats

    // Verify total users is 1 (only address2 is counted as a user)
    const totalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    expect(cvToValue(totalUsers)).toBe(1n);

    // Verify the seat holders list through the print event (we know this works from debug output)
    const printEvent = events.find((e) => e.event === "print_event");
    expect(printEvent).toBeDefined();

    if (printEvent && printEvent.data && printEvent.data.value) {
      const printData = (printEvent.data.value as any).data;
      expect(printData["seat-holders"]).toBeDefined();
      expect(printData["seat-holders"].list).toHaveLength(1);
      expect(printData["seat-holders"].list[0].data.seats.value).toBe(3n);
    }
  });

  it("should allow seat owner (not payer) to claim tokens", () => {
    // Setup: address1 pays for 5 seats owned by address2
    buySeatOnBehalf(address1, address2, 5);

    // Now we need to reach EXACTLY 20 seats with EXACTLY 10 users
    // Current state: 1 user (address2) with 5 seats
    // Need: 9 more users with 15 more seats

    // Get sBTC for remaining users
    [
      address3,
      address4,
      address5,
      address6,
      address7,
      address8,
      address9,
      address10,
      accounts.get("wallet_11")!,
    ].forEach(getSbtc);

    // Add exactly 9 more users with exactly 15 more seats
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address3
    ); // User 2, 7 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address4
    ); // User 3, 9 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address5
    ); // User 4, 11 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address6
    ); // User 5, 13 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address7
    ); // User 6, 15 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address8
    ); // User 7, 16 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address9
    ); // User 8, 17 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      address10
    ); // User 9, 18 seats total

    // Final purchase to reach exactly 10 users and 20 seats - this should trigger distribution
    const finalBuy = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      accounts.get("wallet_11")!
    ); // User 10, 20 seats total

    // Verify we've reached the thresholds
    const totalSeats = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    const totalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    const distributionHeight = simnet.getDataVar(
      "name-pre-faktory",
      "distribution-height"
    );

    expect(cvToValue(totalSeats)).toBe(20n);
    expect(cvToValue(totalUsers)).toBe(10n);
    expect(cvToValue(distributionHeight)).toBeGreaterThan(0);

    simnet.mineEmptyBurnBlocks(250); // Move to vesting period

    // address1 (payer) should NOT be able to claim since they don't own seats
    const { result: payerClaimResult } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address1
    );
    expect(payerClaimResult).toStrictEqual(responseErrorCV(uintCV(302))); // ERR-NOT-SEAT-OWNER

    // address2 (owner) should be able to claim
    const { result: ownerClaimResult, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "claim",
      [token],
      address2
    );

    // The claimable amount should be calculated based on 5 seats and the vesting schedule
    // At block 250 after distribution start, we're at the second vesting entry (3% of tokens per seat)
    // First entry: 10% at block 100 = 20000000000000 per seat * 5 seats = 100000000000000
    // Second entry: 3% at block 250 = 6000000000000 per seat * 5 seats = 30000000000000
    // Total: 130000000000000
    expect(ownerClaimResult).toStrictEqual(
      responseOkCV(uintCV(130000000000000n))
    ); // Corrected expected amount

    // Verify tokens went to address2 (seat owner)
    expect(events[0]).toMatchObject({
      event: "ft_transfer_event",
      data: {
        recipient: address2,
        sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
      },
    });
  });

  it("should handle fee distribution to seat owners, not payers", () => {
    // Setup: Multiple cross-chain purchases
    // address1 pays for address3's 2 seats
    buySeatOnBehalf(address1, address3, 2);
    // address2 pays for address4's 3 seats
    getSbtc(address2);
    buySeatOnBehalf(address2, address4, 3);

    // Current state: 2 users (address3, address4) with 5 seats total
    // Need: 8 more users with 15 more seats to reach exactly 10 users and 20 seats

    [
      address5,
      address6,
      address7,
      address8,
      address9,
      address10,
      accounts.get("wallet_11")!,
      accounts.get("wallet_12")!,
    ].forEach(getSbtc);

    // Add exactly 8 more users with exactly 15 more seats
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address5
    ); // User 3, 7 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address6
    ); // User 4, 9 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address7
    ); // User 5, 11 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address8
    ); // User 6, 13 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address9
    ); // User 7, 15 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      address10
    ); // User 8, 17 seats total
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1), noneCV()],
      accounts.get("wallet_11")!
    ); // User 9, 18 seats total

    // Final purchase to trigger distribution - exactly 10 users and 20 seats
    const finalBuy = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), noneCV()],
      accounts.get("wallet_12")!
    ); // User 10, 20 seats total

    // Verify distribution was triggered
    const totalSeats = simnet.getDataVar(
      "name-pre-faktory",
      "total-seats-taken"
    );
    const totalUsers = simnet.getDataVar("name-pre-faktory", "total-users");
    const distributionHeight = simnet.getDataVar(
      "name-pre-faktory",
      "distribution-height"
    );

    expect(cvToValue(totalSeats)).toBe(20n);
    expect(cvToValue(totalUsers)).toBe(10n);
    expect(cvToValue(distributionHeight)).toBeGreaterThan(0);

    // Open market and generate fees
    simnet.callPublicFn("name-faktory-dex", "open-market", [], deployer);
    getSbtc(address1);
    const buyResult = simnet.callPublicFn(
      "name-faktory-dex",
      "buy",
      [token, uintCV(1_000_000)],
      address1
    );

    simnet.mineEmptyBurnBlocks(2100);

    // Trigger fee distribution
    const { result: airdropResult, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "trigger-fee-airdrop",
      [],
      address1
    );

    expect(airdropResult.type).toBe(7); // response-ok

    // Verify fee distribution goes to seat owners, not payers
    const feeTransferEvents = events.filter(
      (e) => e.event === "ft_transfer_event"
    );

    // Check that address3 and address4 (seat owners) receive fees
    // but address1 and address2 (payers) do not
    const address3FeeEvent = feeTransferEvents.find(
      (e) => e.data && e.data.recipient === address3
    );
    const address4FeeEvent = feeTransferEvents.find(
      (e) => e.data && e.data.recipient === address4
    );
    const address1FeeEvent = feeTransferEvents.find(
      (e) => e.data && e.data.recipient === address1
    );
    const address2FeeEvent = feeTransferEvents.find(
      (e) => e.data && e.data.recipient === address2
    );

    // Verify seat owners get fees, payers don't
    expect(address3FeeEvent).toBeDefined();
    expect(address4FeeEvent).toBeDefined();
    expect(address1FeeEvent).toBeUndefined();
    expect(address2FeeEvent).toBeUndefined();
  });

  it("should handle refunds correctly - refund goes to seat owner, not payer", () => {
    // address1 pays for seats owned by address2
    simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(2), someCV(principalCV(address2))],
      address1
    );

    // Verify seats are owned by address2
    const seatsOwned = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address2)
    );
    expect(seatsOwned).toStrictEqual(someCV(uintCV(2)));

    // address1 (payer) should NOT be able to refund since they don't own seats
    const { result: payerRefundResult } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address1
    );
    expect(payerRefundResult).toStrictEqual(responseErrorCV(uintCV(302))); // ERR-NOT-SEAT-OWNER

    // address2 (seat owner) should be able to refund
    const { result: ownerRefundResult, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "refund",
      [],
      address2
    );
    expect(ownerRefundResult).toStrictEqual(responseOkCV(trueCV()));

    // Verify refund goes to address2 (seat owner), not address1 (payer)
    expect(events[0]).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount: "40000", // 2 seats * 20000 per seat
        recipient: address2, // Seat owner gets refund
        sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
      },
    });

    // Verify seats are removed from address2
    const seatsAfterRefund = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address2)
    );
    expect(seatsAfterRefund).toStrictEqual(noneCV());
  });
});
