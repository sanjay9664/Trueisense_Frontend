async function run() {
  try {
    const res = await fetch("https://app.sochiot.com/api/config-engine/device/c7b614de-e29f-4ada-ba10-053c118b6bf9/modules", {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiYWN0aW9uIjoiYXBpLWtleSIsImFwaS1rZXktdHlwZSI6IkhBUkRXQVJFIiwiaWF0IjoxNjcyNjc3MzcwfQ.xg1tdwlS9wy04MPoQDUhP5AwwU8co4jSyYHZLqLrBRA'
      }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    const modules = json.data || json || [];
    console.log("Modules count:", modules.length);
    for (const m of modules) {
      if (m.name && m.name.includes("RULE")) {
        console.log(`Module Name: ${m.name || m.moduleName}, ID: ${m.id}`);
        const settings = m.settingFieldVOList || m.settingFieldList || m.settingFields || [];
        console.log("  Settings count:", settings.length);
        if (settings.length > 0) {
          console.log("  Sample Settings:", JSON.stringify(settings.slice(0, 2), null, 2));
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
