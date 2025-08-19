import { ParsedTransactionResult } from "@hirosystems/clarinet-sdk";
import {
  contractPrincipalCV,
  cvToJSON,
  noneCV,
  principalCV,
  responseOkCV,
  trueCV,
  uintCV,
  someCV,
  PrincipalCV,
} from "@stacks/transactions";
import fs from "fs";
import path from "path";
import { expect } from "vitest";

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

export const deployer = accounts.get("deployer")!;
export const token = contractPrincipalCV(deployer, "name-faktory");
export const pre = contractPrincipalCV(deployer, "name-pre-faktory");

export const getSbtc = (account: string) => {
  const { result } = simnet.callPublicFn("sbtc-token", "faucet", [], account);

  expect(result).toStrictEqual(responseOkCV(trueCV()));
};

export const buyToken = (account: string, amount: number) => {
  getSbtc(account);
  const { result } = simnet.callPublicFn(
    "name-faktory-dex",
    "buy",
    [token, uintCV(amount)],
    account
  );
  expect(result).toStrictEqual(responseOkCV(trueCV()));
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

// Updated to use new signature with optional stx-owner parameter
export const buySeat = (
  account: string,
  seat: number
  // nonen // stxOwner?: string // Optional parameter for cross-chain functionality
): ParsedTransactionResult => {
  const stxOwnerParam = noneCV();

  return simnet.callPublicFn(
    "name-pre-faktory",
    "buy-up-to",
    [uintCV(seat), stxOwnerParam], // Now passing both parameters
    account
  );
};

export const buySeatOnBehalf = (
  payer: string,
  seatOwner: string,
  seatCount: number
): ParsedTransactionResult => {
  return simnet.callPublicFn(
    "name-pre-faktory",
    "buy-up-to",
    [uintCV(seatCount), someCV(principalCV(seatOwner))],
    payer
  );
};

export const buyAllPreSaleSeats = (): ParsedTransactionResult[] => {
  const owners = [
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
  ];
  owners.forEach(getSbtc);
  return owners.map((owner) => buySeat(owner, 2));
};

export const openMarket = () => {
  buyAllPreSaleSeats();

  const { result } = simnet.callPublicFn(
    "name-faktory-dex",
    "open-market",
    [],
    deployer
  );
  expect(result).toStrictEqual(responseOkCV(trueCV()));
};
