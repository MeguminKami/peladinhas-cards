// Node-only fixture endpoint. No Firebase imports, credentials or external calls.
import {
  tableCommand,
  tableView,
  playerView,
  walletIds,
} from "../../functions/blackjack-table.js";
import { newCasinoWallet } from "../../js/casino-economy.js";
export function blackjackFixtureServer() {
  let table = null;
  const wallets = {};
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "GET") {
      res.end(JSON.stringify(tableView(table)));
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("{}");
      return;
    }
    try {
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (text.length > 4096) throw Error("Pedido demasiado grande.");
      }
      const { uid = "pedro", name = uid, input } = JSON.parse(text);
      for (const id of walletIds(table || { players: [] }, uid))
        wallets[id] ||= newCasinoWallet();
      if (input.action === "balance") {
        res.end(
          JSON.stringify({
            ...playerView(table, uid, wallets[uid].balance),
            serverNow: Date.now(),
          }),
        );
        return;
      }
      if (!table && input.action !== "join") {
        res.end(
          JSON.stringify({
            table: null,
            balance: wallets[uid].balance,
            seat: null,
          }),
        );
        return;
      }
      const result = tableCommand(input, uid, name, table, wallets);
      Object.assign(wallets, result.wallets);
      table = result.closed ? null : result.table;
      res.end(
        JSON.stringify({
          ...playerView(table, uid, wallets[uid].balance),
          stale: !!result.stale,
          serverNow: Date.now(),
        }),
      );
    } catch (error) {
      res.writeHead(409);
      res.end(JSON.stringify({ error: error.message }));
    }
  };
}
