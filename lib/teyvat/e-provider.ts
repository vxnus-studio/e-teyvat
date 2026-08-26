import { createKnowledgeProvider } from "@vxnus/e-provider";

export async function createTeyvatProvider() {
  const provider = createKnowledgeProvider({
    identity: {
      id: "@vxnus/e-teyvat",
      publisher: "vxnus",
    },
    verificationKey: process.env.E_PUBLISHER_API_KEY || "",
  });

  return { provider };
}

