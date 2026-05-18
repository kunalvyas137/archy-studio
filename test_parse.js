import fs from 'fs';
import yaml from 'js-yaml';

// Define the logic roughly as in yamlParser.ts to see where it throws or fails

const yamlString = fs.readFileSync('Staging - RCG Main Flow DT Lookup_v23-0.yaml', 'utf8');

try {
  const doc = yaml.load(yamlString);
  const FLOW_TYPES = ['inboundCall', 'outboundCall', 'inqueueCall', 'secureCall', 'commonModule'];
  const flowTypeKey = FLOW_TYPES.find(k => doc[k]) ?? Object.keys(doc)[0] ?? 'inboundCall';
  const rootFlow = doc[flowTypeKey] ?? Object.values(doc)[0];
  
  if (!rootFlow) {
    console.log("No rootFlow found");
    process.exit(1);
  }
  
  console.log("rootFlow tasks count:", rootFlow.tasks ? rootFlow.tasks.length : 0);
  console.log("rootFlow menus count:", rootFlow.menus ? rootFlow.menus.length : 0);

  // let's check tasks array
  if (rootFlow.tasks && !Array.isArray(rootFlow.tasks)) {
    console.log("tasks is not an array, it's a", typeof rootFlow.tasks);
  }
  
  console.log("Success parsing initial structure.");
} catch (e) {
  console.error("YAML parsing error:", e);
}
