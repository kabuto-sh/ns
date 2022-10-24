import axios from "axios";

export const kabutoResolver = axios.create({
  baseURL: "http://localhost:8080",
});
