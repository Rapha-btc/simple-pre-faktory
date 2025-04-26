import { SimulationBuilder } from "./stxer";
import { contractPrincipalCV, uintCV } from "@stacks/transactions";

async function simulatePrelaunchBuys() {
  // Define deployer address for the contracts
  const DEPLOYER = "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22";
  const PRE_CONTRACT = "fiftysats4-pre-faktory";
  const DEX_CONTRACT = "fiftysats4-faktory-dex";
  const TOKEN_CONTRACT = "fiftysats4-faktory";
  const DEX_BUYER = "SP3E0CP1VCQY50FZ85RCNJ2818QH8KQ507H2D0ZFH";

  // Define the buyers with their seat allocation
  const BUYERS = [
    { address: "SP3SWM3D2HSEDME25BEZ56T64N63NFMG5M49GM795", seats: 7 },
    { address: "SP214EJCRHFF0Y1941FDKQP2J0GBQPG6RKSKHTCVQ", seats: 5 },
    { address: "SP2GH00QH1V5QARBB8JZ42QWBN7JGSRZHSZ4QP6HM", seats: 1 },
    { address: "SP329PX4GGC1807FBK7T35GWM06FC0FVS4HWA6KJD", seats: 1 },
    { address: "SPA5GMDSAG31B8QM33E0R00JXRA0YRQ3VEMPF8RW", seats: 1 },
    { address: "SP3E0CP1VCQY50FZ85RCNJ2818QH8KQ507H2D0ZFH", seats: 1 },
    { address: "SP25W8RSQD15RN14A3ES61W3XHXZ2F954ZS6PS2KX", seats: 1 },
    { address: "SP2RXH1WP94E2NC635ZH1R3NFR6F3ZXYEYZ70T0S", seats: 1 },
    { address: "SP3XNEJ8PJTSWGK7NGVKQ71844ED2NN15JMHEXX0C", seats: 1 },
    { address: "SP3PTAQA7VX2MC54YE9AP7MSSRBE4DZ1XH84V8ZS9", seats: 1 },
  ];

  // Start building the simulation
  let simulation = SimulationBuilder.new().withSender(DEPLOYER);

  // Check initial state of the prelaunch and DEX contracts
  simulation = simulation
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-seats-taken")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-users")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance");

  // Add buy-up-to transactions for each buyer
  BUYERS.forEach((buyer) => {
    simulation = simulation.addContractCall({
      contract_id: `${DEPLOYER}.${PRE_CONTRACT}`,
      function_name: "buy-up-to",
      function_args: [uintCV(buyer.seats)],
      fee: 10000,
      sender: buyer.address,
    });

    // Check state after each buy
    simulation = simulation
      .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-seats-taken")
      .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-users")
      .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "stx-balance");
  });

  // Check final state after all buys
  simulation = simulation
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-seats-taken")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "total-users")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "ft-balance")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance");

  // Now simulate a DEX buy with 69,000 amount
  simulation = simulation
    // First check DEX state before buy
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "open")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "accumulated-fees")

    // Perform the buy on the DEX
    .addContractCall({
      contract_id: `${DEPLOYER}.${DEX_CONTRACT}`,
      function_name: "buy",
      function_args: [
        contractPrincipalCV(DEPLOYER, TOKEN_CONTRACT),
        uintCV(21630000), // 21,630,000 for the buy amount
      ],
      fee: 10000,
      sender: DEX_BUYER,
    })

    // Check DEX state after buy
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "open")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance")

    // Also check for accumulated fees in the prelaunch contract
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "accumulated-fees");

  // Now try buying with 68k sats (which should fail)
  simulation = simulation
    // First check DEX state before failed buy attempt
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "accumulated-fees")

    // Try the buy with insufficient amount (should fail)
    .addContractCall({
      contract_id: `${DEPLOYER}.${DEX_CONTRACT}`,
      function_name: "buy",
      function_args: [
        contractPrincipalCV(DEPLOYER, TOKEN_CONTRACT),
        uintCV(69000), // 68,000 sats (below minimum)
      ],
      fee: 10000,
      sender: DEX_BUYER,
    })

    // Check that state hasn't changed after failed buy
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "stx-balance")
    .addVarRead(`${DEPLOYER}.${DEX_CONTRACT}`, "ft-balance")
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "accumulated-fees")

    // Now trigger the fee airdrop
    .addContractCall({
      contract_id: `${DEPLOYER}.${PRE_CONTRACT}`,
      function_name: "trigger-fee-airdrop",
      function_args: [],
      fee: 10000,
      sender: DEX_BUYER,
    })

    // Check accumulated fees after the airdrop (should be reset)
    .addVarRead(`${DEPLOYER}.${PRE_CONTRACT}`, "accumulated-fees");

  // Simulate the bonus unlock process - with just variable reads and contract calls
  simulation = simulation
    // First check the current state of the bonus contract variables
    .addVarRead(`${DEPLOYER}.fiftysats4-bonus-faktory`, "agent-claim-status")
    .addVarRead(
      `${DEPLOYER}.fiftysats4-bonus-faktory`,
      "originator-claim-status"
    )
    .addVarRead(`${DEPLOYER}.fiftysats4-bonus-faktory`, "deposit-height")
    .addVarRead(`${DEPLOYER}.fiftysats4-bonus-faktory`, "agent-amount")
    .addVarRead(`${DEPLOYER}.fiftysats4-bonus-faktory`, "originator-amount")

    // Try claiming agent bonus (will likely fail due to block height)
    .addContractCall({
      contract_id: `${DEPLOYER}.fiftysats4-bonus-faktory`,
      function_name: "claim-agent-bonus",
      function_args: [contractPrincipalCV(DEPLOYER, TOKEN_CONTRACT)],
      fee: 10000,
      sender: DEX_BUYER, // FAKTORY address
    })

    // Check state after agent bonus claim attempt
    .addVarRead(`${DEPLOYER}.fiftysats4-bonus-faktory`, "agent-claim-status")

    // Try claiming originator bonus (will likely fail due to block height)
    .addContractCall({
      contract_id: `${DEPLOYER}.fiftysats4-bonus-faktory`,
      function_name: "claim-originator-bonus",
      function_args: [contractPrincipalCV(DEPLOYER, TOKEN_CONTRACT)],
      fee: 10000,
      sender: DEX_BUYER, // ORIGINATOR address
    })

    // Check state after originator bonus claim attempt
    .addVarRead(
      `${DEPLOYER}.fiftysats4-bonus-faktory`,
      "originator-claim-status"
    );
  // Run the simulation
  const simulationId = await simulation.run();
  console.log(
    `View results at: https://stxer.xyz/simulations/mainnet/${simulationId}`
  );
}

simulatePrelaunchBuys().catch(console.error);
