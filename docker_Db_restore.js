const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function restoreDatabase() {
  try {
    const containers = execSync('docker ps --format "{{.Names}}"')
      .toString()
      .trim()
      .split("\n");

    console.log("\n📦 Available Docker Containers:");
    containers.forEach((name, i) => console.log(`${i + 1}. ${name}`));

    const containerIndex = await ask("\n🔢 Select container number: ");
    const container = containers[parseInt(containerIndex) - 1];

    if (!container) {
      console.error("❌ Invalid container selection.");
      rl.close();
      return;
    }

    const defaultDbName = container;
    const database =
      (await ask(`🗃️ Enter database name (default: ${defaultDbName}): `)) ||
      defaultDbName;

    const username =
      (await ask("👤 Enter DB username (default: root): ")) || "root";
    const password =
      (await ask("🔐 Enter DB password (default: admin): ")) || "admin";

    if (!fs.existsSync("backup.sql")) {
      console.error("\n❌ backup.sql not found!");
    } else {
      console.log(
        `\n📁 Found backup.sql — preparing to restore into '${database}'`
      );

      // Step 1: Create the database if it doesn't exist
      const createCmd = `docker exec ${container} mysql -u ${username} --password=${password} -e "CREATE DATABASE IF NOT EXISTS \\\`${database}\\\`;"`;
      execSync(createCmd);
      console.log(`✅ Database '${database}' ensured.`);

      // Step 2: Restore the dump
      const sql = fs.readFileSync("backup.sql");
      const restoreCmd = `docker exec -i ${container} /usr/bin/mysql -u ${username} --password=${password} ${database}`;
      execSync(restoreCmd, { input: sql });
      console.log("\n✅ Restore completed from backup.sql");
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    rl.close();
  }
}

restoreDatabase();
