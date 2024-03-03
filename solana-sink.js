import {
  createRequest,
  isEmptyMessage,
  streamBlocks,
  unpackMapOutput,
  createAuthInterceptor,
  createRegistry,
  fetchSubstream,
} from "@substreams/core";
import { createConnectTransport } from "@bufbuild/connect-web";
import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const TOKEN = process.env.TOKEN;
const START_BLOCK = process.env.START_BLOCK;
const SPKG =
  "https://spkg.io/topledger/tl-solana-dex-trades-1-0-13-v1.0.13.spkg";
const MODULE = "map_block";

const fetchPackage = async () => {
  return await fetchSubstream(SPKG);
};

const pool = new Pool({
  user: "postgres",
  host: "postgres",
  database: "postgres",
  password: "test",
  port: 5432,
});

const saveToDatabase = async (data) => {
  const client = await pool.connect();
  try {
    const queryText = `INSERT INTO transaction_data (block_date, block_time, block_slot, tx_id, signer, pool_address, base_mint, quote_mint, base_vault, quote_vault, base_amount, quote_amount, is_inner_instruction, instruction_index, instruction_type, inner_instruction_index, outer_program, inner_program, txn_fee, signer_sol_change) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;

    for (const entry of data) {
      let values = Object.values(entry);

      values = values.map((value, index) =>
        index === 10 || index === 11 ? String(value) : value
      );

      console.log(values);
      await client.query(queryText, values);
    }
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

const main = async () => {
  const pkg = await fetchPackage();
  const registry = createRegistry(pkg);

  const transport = createConnectTransport({
    baseUrl: "https://mainnet.sol.streamingfast.io:443",
    interceptors: [createAuthInterceptor(TOKEN)],
    useBinaryFormat: true,
    jsonOptions: {
      typeRegistry: registry,
    },
  });

  const request = createRequest({
    substreamPackage: pkg,
    outputModule: MODULE,
    productionMode: true,
    startBlockNum: START_BLOCK,
  });

  for await (const response of streamBlocks(transport, request)) {
    console.log(response);
    const output = unpackMapOutput(response, registry);

    if (output !== undefined && !isEmptyMessage(output)) {
      const outputAsJson = output.toJson({ typeRegistry: registry });
      saveToDatabase(outputAsJson.data);
    }
  }
};

main();
