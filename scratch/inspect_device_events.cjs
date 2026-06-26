const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb://isaqaadmin:password@44.240.110.54:27017/isa_qa";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
    
    const db = client.db('isa_qa');
    const collection = db.collection('device_events');
    
    // Find latest events
    const latestEvents = await collection.find({}).sort({ created_at_timestamp: -1 }).limit(10).toArray();
    
    console.log("=== LATEST 10 EVENTS ===");
    latestEvents.forEach((event, idx) => {
      console.log(`\nEvent ${idx + 1}:`);
      console.log(`module_id: ${event.module_id}`);
      console.log(`created_at_timestamp: ${event.created_at_timestamp} (${new Date(event.created_at_timestamp)})`);
      // Print keys except _id
      const printKeys = { ...event };
      delete printKeys._id;
      console.log(JSON.stringify(printKeys, null, 2));
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
