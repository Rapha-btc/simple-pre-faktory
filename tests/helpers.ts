import {
  contractPrincipalCV,
  cvToJSON,
  noneCV,
  principalCV,
  responseOkCV,
  trueCV,
  uintCV,
} from "@stacks/transactions";
import fs from "fs";
import path from "path";
import { expect } from "vitest";

const accounts = simnet.getAccounts();
export const deployer = accounts.get("deployer")!;
export const token = contractPrincipalCV(deployer, "name-faktory");

export const getSbtc = (account: string) => {
  const { result } = simnet.callPublicFn("sbtc-token", "faucet", [], account);

  expect(result).toEqual(responseOkCV(trueCV()));
};

export const buyToken = (account: string, amount: number) => {
  getSbtc(account);
  const { result } = simnet.callPublicFn(
    "name-faktory-dex",
    "buy",
    [token, uintCV(amount)],
    account
  );
  expect(result).toEqual(responseOkCV(trueCV()));
};

const stubTokenContractName = "stub-token";
export const stubTokenContract = contractPrincipalCV(
  deployer,
  stubTokenContractName
);
export const deployStubToken = () => {
  const stubContract = fs.readFileSync(
    path.join(__dirname, "./stub-faktory.clar"),
    "utf-8"
  );
  simnet.setEpoch("3.0");
  simnet.deployContract(stubTokenContractName, stubContract, null, deployer);
};
