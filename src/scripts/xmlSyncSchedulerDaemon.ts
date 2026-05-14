import "dotenv/config";

import { startXmlSyncScheduler } from "@/lib/xmlSyncScheduler";

startXmlSyncScheduler();
console.log("XML URL sync scheduler running (checks due stores every 60s).");
