async function run() {
  try {
    const res = await fetch("https://app.sochiot.com/api/config-engine/device/1238", {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiYWN0aW9uIjoiYXBpLWtleSIsImFwaS1rZXktdHlwZSI6IkhBUkRXQVJFIiwiaWF0IjoxNjcyNjc3MzcwfQ.xg1tdwlS9wy04MPoQDUhP5AwwU8co4jSyYHZLqLrBRA'
      }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    const modules = json.data?.modules || json.modules || [];
    console.log("Modules count:", modules.length);
    for (const m of modules) {
      console.log(`Module Name: ${m.name || m.moduleName}, ID: ${m.id}`);
      const settings = m.settingFieldVOList || m.settingFieldList || m.settingFields || [];
      console.log("  Settings count:", settings.length);
      if (settings.length > 0) {
        console.log("  Sample Settings:", JSON.stringify(settings.slice(0, 3), null, 2));
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
