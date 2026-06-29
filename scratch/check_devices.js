import pg from 'pg';

async function run() {
  const client = new pg.Client({
    connectionString: "postgresql://postgres:BmsDbSecPass_987x!@localhost:5432/bms_db"
  });
  try {
    await client.connect();
    console.log("Connected to DB successfully!");
    const res = await client.query("SELECT id, name, category, \"sochiotDeviceId\" FROM devices LIMIT 50");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Local DB failed, trying Neon DB...", err.message);
    const clientNeon = new pg.Client({
      connectionString: "postgresql://neondb_owner:npg_w0KWx2vkYSdT@ep-little-dew-anr2rcix.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });
    try {
      await clientNeon.connect();
      console.log("Connected to Neon DB successfully!");
      const res = await clientNeon.query("SELECT id, name, category, \"sochiotDeviceId\" FROM devices LIMIT 50");
      console.log(JSON.stringify(res.rows, null, 2));
      await clientNeon.end();
    } catch (neonErr) {
      console.error("Neon DB also failed:", neonErr.message);
    }
  } finally {
    try { await client.end(); } catch(e) {}
  }
}
run();
