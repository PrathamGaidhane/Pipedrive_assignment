import dotenv from "dotenv";
import axios from "axios";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";

// Load .env
dotenv.config();

const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

// ------------------------------
// SYNC FUNCTION

export const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    if (!apiKey || !companyDomain) {
      throw new Error("Missing API key or company domain in .env");
    }

    // Build payload for Pipedrive Person
    const payload: any = {};

    const getValue = (obj: any, path: string) => {
      return path.split(".").reduce((acc, key) => acc?.[key], obj);
    };

    // Find mapping for name
    const nameMapping = mappings.find((m) => m.pipedriveKey === "name");
    if (!nameMapping) throw new Error("No mapping found for Pipedrive 'name' field");

    const personName = getValue(inputData, nameMapping.inputKey);
    if (!personName) throw new Error("Name value missing in inputData.json");

    // Build payload using JSON mappings
    for (const map of mappings) {
      const value = getValue(inputData, map.inputKey);
      if (value !== undefined) payload[map.pipedriveKey] = value;
    }

    // Step 1 — Search person in Pipedrive
    const searchUrl = `https://${companyDomain}.pipedrive.com/api/v1/persons/search?term=${encodeURIComponent(
      personName
    )}&api_token=${apiKey}`;

    const searchRes = await axios.get(searchUrl);
    const existing = searchRes.data?.data?.items?.[0]?.item;

    // Step 2 — Update if exists, else create
    if (existing) {
      const updateUrl = `https://${companyDomain}.pipedrive.com/api/v1/persons/${existing.id}?api_token=${apiKey}`;
      const updateRes = await axios.put(updateUrl, payload);
      console.log("Updated existing person.");
      return updateRes.data.data;
    } else {
      const createUrl = `https://${companyDomain}.pipedrive.com/api/v1/persons?api_token=${apiKey}`;
      const createRes = await axios.post(createUrl, payload);
      console.log("Created new person.");
      return createRes.data.data;
    }
  } catch (err: any) {
    console.error("Error in syncPdPerson:", err.message);
    throw err;
  }
};

// ------------------------------
// RUN FUNCTION

syncPdPerson()
  .then((res) => console.log("Result:", res))
  .catch(console.error);
