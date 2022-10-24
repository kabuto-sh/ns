import axios from "axios";

export const hederaMirror = axios.create({
  // TODO: need a way to change network globally?
  baseURL: "https://testnet.mirrornode.hedera.com/",
});
