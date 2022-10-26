import axios from "axios";

export const kabutoResolver = axios.create({
  // TODO: configure via new KNS
  baseURL: "/api",
});
