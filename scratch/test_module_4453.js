async function run() {
  try {
    const res = await fetch("https://app.sochiot.com/api/config-engine/module/4453", {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiYWN0aW9uIjoiYXBpLWtleSIsImFwaS1rZXktdHlwZSI6IkhBUkRXQVJFIiwiaWF0IjoxNjcyNjc3MzcwfQ.xg1tdwlS9wy04MPoQDUhP5AwwU8co4jSyYHZLqLrBRA'
      }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
