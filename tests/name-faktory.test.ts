import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { deployer, buyToken, openMarket } from "./helpers";
import {
  bufferCVFromString,
  contractPrincipalCV,
  listCV,
  noneCV,
  principalCV,
  responseErrorCV,
  responseOkCV,
  someCV,
  stringAsciiCV,
  stringUtf8CV,
  trueCV,
  tupleCV,
  uintCV,
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const address4 = accounts.get("wallet_4")!;

describe("transfer", () => {
  beforeEach(() => {
    openMarket();
  });

  it("ensures the tx-sender and the token sender are the same", () => {
    buyToken(address1, 100_000);

    const { result: errorResult } = simnet.callPublicFn(
      "name-faktory",
      "transfer",
      [uintCV(10000), principalCV(address1), principalCV(address2), noneCV()],
      address2
    );
    expect(errorResult).toStrictEqual(responseErrorCV(uintCV(401)));

    const { result } = simnet.callPublicFn(
      "name-faktory",
      "transfer",
      [uintCV(10000), principalCV(address1), principalCV(address2), noneCV()],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
  });

  it("transfers the given amount to the recipient", () => {
    buyToken(address1, 100_000);

    const { result, events } = simnet.callPublicFn(
      "name-faktory",
      "transfer",
      [
        uintCV(10000),
        principalCV(address1),
        principalCV(address2),
        someCV(bufferCVFromString("Memo")),
      ],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "amount": "10000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
            "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory",
            "raw_value": "0x0a02000000044d656d6f",
            "topic": "print",
            "value": {
              "type": 10,
              "value": {
                "buffer": Uint8Array [
                  77,
                  101,
                  109,
                  111,
                ],
                "type": 2,
              },
            },
          },
          "event": "print_event",
        },
      ]
    `);
  });

  it("returns an error if the underlying transfer fails", () => {
    const { result } = simnet.callPublicFn(
      "name-faktory",
      "transfer",
      [
        uintCV(10000),
        principalCV(address1),
        principalCV(address2),
        someCV(bufferCVFromString("Memo")),
      ],
      address1
    );

    expect(result).toStrictEqual(responseErrorCV(uintCV(1)));
  });
});

describe("set-token-uri", () => {
  it("ensures the contract caller is the contract owner", () => {
    const { result } = simnet.callPublicFn(
      "name-faktory",
      "set-token-uri",
      [stringUtf8CV("https://example.com")],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(401)));
  });

  it("allows the contract owner to set the token URI and prints a notification", () => {
    const { result, events } = simnet.callPublicFn(
      "name-faktory",
      "set-token-uri",
      [stringUtf8CV("https://example.com")],
      deployer
    );
    expect(result).toStrictEqual(
      responseOkCV(
        tupleCV({
          notification: stringAsciiCV("token-metadata-update"),
          payload: tupleCV({
            "contract-id": contractPrincipalCV(deployer, "name-faktory"),
            "token-class": stringAsciiCV("ft"),
          }),
        })
      )
    );
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory",
            "raw_value": "0x0c000000020c6e6f74696669636174696f6e0d00000015746f6b656e2d6d657461646174612d757064617465077061796c6f61640c000000020b636f6e74726163742d6964061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce0c6e616d652d66616b746f72790b746f6b656e2d636c6173730d000000026674",
            "topic": "print",
            "value": {
              "data": {
                "notification": {
                  "data": "token-metadata-update",
                  "type": 13,
                },
                "payload": {
                  "data": {
                    "contract-id": {
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
                    "token-class": {
                      "data": "ft",
                      "type": 13,
                    },
                  },
                  "type": 12,
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

describe("set-contract-owner", () => {
  it("only allows the contract owner to set a new contract owner", () => {
    const { result } = simnet.callPublicFn(
      "name-faktory",
      "set-contract-owner",
      [principalCV(address1)],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(401)));
  });

  it("allows the contract owner to set a new contract owner", () => {
    const { result } = simnet.callPublicFn(
      "name-faktory",
      "set-contract-owner",
      [principalCV(address1)],
      deployer
    );
    const newContractOwner = simnet.getDataVar(
      "name-faktory",
      "contract-owner"
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(newContractOwner).toStrictEqual(principalCV(address1));
  });
});

describe("send-many", () => {
  beforeEach(() => {
    openMarket();
  });

  it("allows sending tokens to many recipients", () => {
    buyToken(address1, 100_000);
    const { result, events } = simnet.callPublicFn(
      "name-faktory",
      "send-many",
      [
        listCV([
          tupleCV({
            to: principalCV(address2),
            amount: uintCV(10000),
            memo: someCV(bufferCVFromString("Memo")),
          }),
          tupleCV({
            to: principalCV(address3),
            amount: uintCV(10000),
            memo: noneCV(),
          }),
          tupleCV({
            to: principalCV(address4),
            amount: uintCV(10000),
            memo: noneCV(),
          }),
        ]),
      ],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(trueCV()));
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "amount": "10000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
            "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory",
            "raw_value": "0x0a02000000044d656d6f",
            "topic": "print",
            "value": {
              "type": 10,
              "value": {
                "buffer": Uint8Array [
                  77,
                  101,
                  109,
                  111,
                ],
                "type": 2,
              },
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "10000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
            "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory",
            "raw_value": "0x09",
            "topic": "print",
            "value": {
              "type": 9,
            },
          },
          "event": "print_event",
        },
        {
          "data": {
            "amount": "10000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory::NAME",
            "recipient": "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND",
            "sender": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
          },
          "event": "ft_transfer_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory",
            "raw_value": "0x09",
            "topic": "print",
            "value": {
              "type": 9,
            },
          },
          "event": "print_event",
        },
      ]
    `);
  });

  it("fails if there is an error while processing the transfers", () => {
    buyToken(address1, 100_000); // 1_785_063_752_276_868 in name-faktory tokens
    const { result, events } = simnet.callPublicFn(
      "name-faktory",
      "send-many",
      [
        listCV([
          tupleCV({
            to: principalCV(address2),
            amount: uintCV(BigInt(1_585_063_752_276_868)),
            memo: someCV(bufferCVFromString("Memo")),
          }),
          tupleCV({
            to: principalCV(address3),
            amount: uintCV(200_000_000_000_000),
            memo: noneCV(),
          }),
          tupleCV({
            to: principalCV(address4),
            amount: uintCV(100_000_000_000_000),
            memo: noneCV(),
          }),
        ]),
      ],
      address1
    );
    expect(result).toStrictEqual(responseErrorCV(uintCV(1)));
    expect(events).toStrictEqual([]);
  });
});

describe("on deployment", () => {
  it("mints 80% of the token to the treasury, 16% to the dex and 4% to the pre-faktory contract", () => {
    const contract = fs.readFileSync(
      path.resolve(__dirname, "../contracts/name-faktory.clar"),
      "utf-8"
    );
    simnet.setEpoch("3.0");
    const { result, events } = simnet.deployContract(
      "new-token",
      contract,
      null,
      deployer
    );
    expect(result).toStrictEqual(
      tupleCV({
        type: stringAsciiCV("faktory-trait-v1"),
        name: stringAsciiCV("ai sbtc"),
        symbol: stringAsciiCV("NAME"),
        "token-uri": stringUtf8CV(
          "https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json"
        ),
        tokenContract: contractPrincipalCV(deployer, "new-token"),
        supply: uintCV(BigInt("100000000000000000")),
        decimals: uintCV(8),
        targetStx: uintCV(5000000),
        tokenToDex: uintCV(BigInt(16000000000000000)),
        tokenToDeployer: uintCV(4000000000000000),
        stxToDex: uintCV(0),
        stxBuyFirstFee: uintCV(0),
      })
    );
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "amount": "80000000000000000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.new-token::NAME",
            "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-treasury",
          },
          "event": "ft_mint_event",
        },
        {
          "data": {
            "amount": "16000000000000000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.new-token::NAME",
            "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-faktory-dex",
          },
          "event": "ft_mint_event",
        },
        {
          "data": {
            "amount": "4000000000000000",
            "asset_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.new-token::NAME",
            "recipient": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.name-pre-faktory",
          },
          "event": "ft_mint_event",
        },
        {
          "data": {
            "contract_identifier": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.new-token",
            "raw_value": "0x0c0000000c08646563696d616c730100000000000000000000000000000008046e616d650d00000007616920736274630e7374784275794669727374466565010000000000000000000000000000000008737478546f446578010000000000000000000000000000000006737570706c79010000000000000000016345785d8a00000673796d626f6c0d000000044e414d450974617267657453747801000000000000000000000000004c4b4009746f6b656e2d7572690e0000007268747470733a2f2f626e6379747a79666166636c6d647872777067712e73757061626173652e636f2f73746f726167652f76312f6f626a6563742f7075626c69632f746f6b656e732f36303336306236372d356632652d346466622d616463342d6638626637633961616238352e6a736f6e0d746f6b656e436f6e7472616374061a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce096e65772d746f6b656e0f746f6b656e546f4465706c6f796572010000000000000000000e35fa931a00000a746f6b656e546f4465780100000000000000000038d7ea4c68000004747970650d0000001066616b746f72792d74726169742d7631",
            "topic": "print",
            "value": {
              "data": {
                "decimals": {
                  "type": 1,
                  "value": 8n,
                },
                "name": {
                  "data": "ai sbtc",
                  "type": 13,
                },
                "stxBuyFirstFee": {
                  "type": 1,
                  "value": 0n,
                },
                "stxToDex": {
                  "type": 1,
                  "value": 0n,
                },
                "supply": {
                  "type": 1,
                  "value": 100000000000000000n,
                },
                "symbol": {
                  "data": "NAME",
                  "type": 13,
                },
                "targetStx": {
                  "type": 1,
                  "value": 5000000n,
                },
                "token-uri": {
                  "data": "https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json",
                  "type": 14,
                },
                "tokenContract": {
                  "address": {
                    "hash160": "6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce",
                    "type": 0,
                    "version": 26,
                  },
                  "contractName": {
                    "content": "new-token",
                    "lengthPrefixBytes": 1,
                    "maxLengthBytes": 128,
                    "type": 2,
                  },
                  "type": 6,
                },
                "tokenToDeployer": {
                  "type": 1,
                  "value": 4000000000000000n,
                },
                "tokenToDex": {
                  "type": 1,
                  "value": 16000000000000000n,
                },
                "type": {
                  "data": "faktory-trait-v1",
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

describe("get-balance", () => {
  it("returns the balance of the given account", () => {
    openMarket();
    buyToken(address1, 100_000);
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-balance",
      [principalCV(address1)],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(uintCV(1163204747774481n)));
  });
});

describe("get-name", () => {
  it("returns the token name", () => {
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-name",
      [],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(stringAsciiCV("ai sbtc")));
  });
});

describe("get-symbol", () => {
  it("returns the token symbol", () => {
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-symbol",
      [],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(stringAsciiCV("NAME")));
  });
});

describe("get-decimals", () => {
  it("return the token number of decimals", () => {
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-decimals",
      [],
      address1
    );
    expect(result).toStrictEqual(responseOkCV(uintCV(8)));
  });
});

describe("get-supply", () => {
  it("returns the token supply", () => {
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-total-supply",
      [],
      address1
    );
    expect(result).toStrictEqual(
      responseOkCV(uintCV(BigInt("100000000000000000")))
    );
  });
});

describe("get-token-uri", () => {
  it("returns the token URI", () => {
    const { result } = simnet.callReadOnlyFn(
      "name-faktory",
      "get-token-uri",
      [],
      address1
    );
    expect(result).toStrictEqual(
      responseOkCV(
        someCV(
          stringUtf8CV(
            "https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json"
          )
        )
      )
    );
  });
});
