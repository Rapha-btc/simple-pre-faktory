import {
  contractPrincipalCV,
  noneCV,
  principalCV,
  responseOkCV,
  trueCV,
  uintCV,
} from "@stacks/transactions";
import { expect } from "vitest";

const accounts = simnet.getAccounts();
export const deployer = accounts.get("deployer")!;
export const token = contractPrincipalCV(deployer, "name-faktory");

export const getSbtc = async (account: string) => {
  const { result } = simnet.callPublicFn(
    "sbtc-token",
    "transfer",
    [uintCV(69000000), principalCV(deployer), principalCV(account), noneCV()],
    deployer
  );

  expect(result).toEqual(responseOkCV(trueCV()));
};

export const getToken = async (account: string, amount: number) => {
  // Gets 6.9 sBTC
  getSbtc(account);
  const { result } = simnet.callPublicFn(
    "name-faktory-dex",
    "buy",
    [token, uintCV(amount)],
    account
  );
  expect(result).toEqual(responseOkCV(trueCV()));
};
