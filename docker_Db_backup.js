
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function backupDatabase() {
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
      (await ask("🔐 Enter DB password (default: anin): ")) || "anin";

    console.log(
      `\n📤 Backing up '${database}' from container '${container}'...`
    );

    const cmd = `docker exec ${container} /usr/bin/mysqldump -u ${username} --password=${password} ${database}`;
    const backup = execSync(cmd);

    // Ensure backup folder exists
    const backupDir = path.join(__dirname, "backup");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
      console.log("📁 Created 'backup' folder.");
    }

    // Save backup file
    const backupFilePath = path.join(backupDir, `${container}.sql`);
    fs.writeFileSync(backupFilePath, backup);
    console.log(`\n✅ Backup completed: ${backupFilePath}`);

    const timestamp = new Date().toISOString();
    console.log(`🕒 Backup time: ${timestamp}`);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    rl.close();
  }
}

backupDatabase();
