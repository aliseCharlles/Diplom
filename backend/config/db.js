import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "itlingo",
  // pg SCRAM auth expects a string password
  password: String(process.env.DB_PASSWORD ?? ""),
  port: Number(process.env.DB_PORT) || 5432
});

export default pool;