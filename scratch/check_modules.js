import { MongoClient } from 'mongodb';

async function run() {
  const uri = "mongodb://isaqaadmin:password@44.240.110.54:27017/isa_qa";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
    const db = client.db("isa_qa");
    const collection = db.collection('device_events');
    
    const targetModules = [4699, 4697, 4591, 4589];
    for (const modId of targetModules) {
      const latestEvent = await collection.findOne(
        { module_id: modId },
        { sort: { created_at_timestamp: -1 } }
      );
      if (latestEvent) {
        console.log(`Module ${modId} latest event time:`, new Date(latestEvent.created_at_timestamp > 1e12 ? latestEvent.created_at_timestamp : latestEvent.created_at_timestamp * 1000).toLocaleString());
        console.log(`Sample payload:`, JSON.stringify(latestEvent, null, 2));
      } else {
        console.log(`No events found for module ${modId}`);
      }
    }
  } catch (err) {
    console.error("MongoDB error:", err.message);
  } finally {
    await client.close();
  }
}
run();
