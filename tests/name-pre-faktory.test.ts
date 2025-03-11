import { beforeEach, describe, expect, it } from "vitest";
import { buyAllPreSaleSeats, getSbtc } from "./helpers";
import {
  cvToValue,
  principalCV,
  responseErrorCV,
  responseOkCV,
  trueCV,
  uintCV,
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

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
    expect(result).toEqual(responseErrorCV(uintCV(320)));
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
    expect(result).toEqual(responseOkCV(trueCV()));
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

    expect(result).toEqual(responseOkCV(trueCV()));
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
    expect(result).toEqual(responseOkCV(trueCV()));
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

    expect(result).toEqual(responseOkCV(trueCV()));
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
  it("should only allow refunding if period 1 expired");
  it("should not allow refunding after tokens were distributed");
  it("should now allow refunding if sender does not own seats");
  it("should transfer back the invested usbtc");
  it("should remove the seat owner from the list of holders");
  it("should remove the seats owned by the user");
  it(
    "should update the total seats taken, the total users and the usbtc balance"
  );
  it("should print a receipt");
});

describe("claim", () => {
  it(
    "should not allow claiming tokens if the distribution period has not started yet"
  );
  it(
    "should not allow claiming tokens for a different token than the assigned"
  );
  it("should not allow claiming tokens if sender was not a seat owner");
  it("should not allow claiming tokens if sender has nothing to claim");
  it(
    "should not allow claiming tokens if the contract does not hold enough of the token"
  );
  it("should transfer the claimable amount to the sender");
  it("should updated the amount claimed after a successful claim");
  it("should update the token balance after a successful claim");
  it("should print a receipt");

  describe("get-claimable-amount", () => {
    it("should set the claimable amount based on the vesting schedule");
  });
});

describe("claim-on-behalf", () => {
  it(
    "should not allow claiming tokens if the distribution period has not started yet"
  );
  it(
    "should not allow claiming tokens for a different token than the assigned"
  );
  it("should not allow claiming tokens if the set holder was not a seat owner");
  it("should not allow claiming tokens if the set holder has nothing to claim");
  it(
    "should not allow claiming tokens if the contract does not hold enough of the token"
  );
  it("should transfer the claimable amount to the set holder");
  it("should updated the amount claimed after a successful claim");
  it("should update the token balance after a successful claim");
  it("should print a receipt");
});

describe("toggle-bonded", () => {
  it("should only allow the dex contract to call it", () => {});
  it("should set accelerated-vesting and final-airdrop-mode to true");
});

describe("trigger-fee-airdrop", () => {
  it("should not allow triggering during cooldown period");
  it("should not allow triggering if there are no fees to distribute");
  it("should not allow triggering if no seats are taken");
  it("should distribute the user share for every seat owner");
});
