async function run() {
  try {
    const url = "https://bms-api.sochiot.com/api/v1/sites/1/devices/4/telemetry/snapshots?fieldKey=3,100&interval=HOURLY&from=2026-07-01T18:30:00.000Z&to=2026-07-02T18:29:59.000Z";
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiYWN0aW9uIjoiYXBpLWtleSIsImFwaS1rZXktdHlwZSI6IkhBUkRXQVJFIiwiaWF0IjoxNjcyNjc3MzcwfQ.xg1tdwlS9wy04MPoQDUhP5AwwU8co4jSyYHZLqLrBRA'
      }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
