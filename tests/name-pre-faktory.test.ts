import { beforeEach, describe, expect, it } from "vitest";
import {
  buyAllPreSaleSeats,
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

describe("buy-up-to", () => {
  beforeEach(() => {
    getSbtc(address1);
  });

  it("should not allow buying seats after tokens were distributed", () => {
    buyAllPreSaleSeats();
    const { result } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(1)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(320)));
  });

  it("should not allow buying more seats than available", () => {
    const { result, events } = simnet.callPublicFn(
      "name-pre-faktory",
      "buy-up-to",
      [uintCV(30)],
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
      [uintCV(7)],
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

    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(7)], address1);

    const totalUsersAfter = simnet.getDataVar(
      "name-pre-faktory",
      "total-users"
    );
    expect(cvToValue(totalUsersAfter)).toBe(BigInt(1));
  });

  it("should updated the number of seats owned by the user", () => {
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(2)], address1);
    const totalUserSeatsBefore = simnet.getMapEntry(
      "name-pre-faktory",
      "seats-owned",
      principalCV(address1)
    );
    expect(cvToValue(totalUserSeatsBefore).value).toBe("2");

    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(3)], address1);
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
      [uintCV(7)],
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
      [uintCV(2)],
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
      [uintCV(2)],
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
      [uintCV(2)],
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
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(2)], address1);
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
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(2)], address1);
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
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(2)], address1);
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
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(2)], address1);
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
    simnet.callPublicFn("name-pre-faktory", "buy-up-to", [uintCV(5)], address1);
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
    expect(result).toStrictEqual(responseOkCV(uintCV(40000n)));
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051a7321b74e2b6a7e949e6c4ad313035b1665095017057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "7321b74e2b6a7e949e6c4ad313035b1665095017",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051a99e2ec69ac5b6e67b4e26edd0e2c1c1a6b9bbd23057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "99e2ec69ac5b6e67b4e26edd0e2c1c1a6b9bbd23",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051aa5180cc1ff6050df53f0ab766d76b630e14feb0c057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "a5180cc1ff6050df53f0ab766d76b630e14feb0c",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051a05572d04565d56f67e84ad7e20deedd8e7bba2fd057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "05572d04565d56f67e84ad7e20deedd8e7bba2fd",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051ab0e8c72590d8ec330b75a9089d220dcd6f4d4a6e057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "b0e8c72590d8ec330b75a9089d220dcd6f4d4a6e",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051ad540a8a654c4c0f54f910212ff3b119cb2257bb8057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "d540a8a654c4c0f54f910212ff3b119cb2257bb8",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051aecf08f87f8318a104a46ff8dbee72e761988d8eb057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "ecf08f87f8318a104a46ff8dbee72e761988d8eb",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051aeabc65f3e890fb8bf20d153e95119c72d85765a9057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "eabc65f3e890fb8bf20d153e95119c72d85765a9",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST2ZB99W3GWYV4F3JRG81MXEVW9CYDBHWXPW1ETG",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051a05f5a53c1c39ed91e3962080d3aedf12cf3571e7057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "05f5a53c1c39ed91e3962080d3aedf12cf3571e7",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "4000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token::sbtc-token",
            "recipient": "ST38KBGBJ34TPJCHB03TRN1X1DGASTSGGQPZD74WZ",
            "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c0000000406616d6f756e740100000000000000000000000000000fa009726563697069656e74051ad135c172193569322b00f58a87a16c159d6610bd057365617473010000000000000000000000000000000204747970650d000000106665652d646973747269627574696f6e",
            "topic": "print",
            "value": {
              "data": {
                "amount": {
                  "type": 1,
                  "value": 4000n,
                },
                "recipient": {
                  "address": {
                    "hash160": "d135c172193569322b00f58a87a16c159d6610bd",
                    "type": 0,
                    "version": 26,
                  },
                  "type": 5,
                },
                "seats": {
                  "type": 1,
                  "value": 2n,
                },
                "type": {
                  "data": "fee-distribution",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
            "raw_value": "0x0c000000030974696d657374616d70010000000000000000000000000000084d11746f74616c2d64697374726962757465640100000000000000000000000000009c4004747970650d0000000b6665652d61697264726f70",
            "topic": "print",
            "value": {
              "data": {
                "timestamp": {
                  "type": 1,
                  "value": 2125n,
                },
                "total-distributed": {
                  "type": 1,
                  "value": 40000n,
                },
                "type": {
                  "data": "fee-airdrop",
                  "type": 13,
                },
              },
              "type": 12,
            },
          },
          "event": "print_event",
        },
      ]
    `);
  });
});
