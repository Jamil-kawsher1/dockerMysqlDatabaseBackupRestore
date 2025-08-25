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

async function restoreDatabase() {
  try {
    // Get running Docker containers
    const containersRaw = execSync('docker ps --format "{{.Names}}"')
      .toString()
      .trim();

    if (!containersRaw) {
      console.error("❌ No running Docker containers found.");
      rl.close();
      return;
    }

    const containers = containersRaw.split("\n");
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

    // Read backup directory
    const backupDir = path.join(__dirname, "backup");

    if (!fs.existsSync(backupDir)) {
      console.error("❌ Backup folder '/backup' does not exist.");
      rl.close();
      return;
    }

    const sqlFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith(".sql"));

    if (sqlFiles.length === 0) {
      console.error("❌ No .sql files found in /backup directory.");
      rl.close();
      return;
    }

    console.log("\n📁 Available Backup Files in /backup:");
    sqlFiles.forEach((file, i) => console.log(`${i + 1}. ${file}`));

    const selectedFileIndex = await ask("\n📄 Select file number to restore: ");
    const selectedFile = sqlFiles[parseInt(selectedFileIndex) - 1];

    if (!selectedFile) {
      console.error("❌ Invalid file selection.");
      rl.close();
      return;
    }

    const fullPath = path.join(backupDir, selectedFile);
    console.log(
      `\n📁 Found ${selectedFile} — preparing to restore into '${database}'`
    );

    // Step 1: Create the database if it doesn't exist
    const createCmd =
      `docker exec ${container} mysql -u ${username} --password=${password} -e "CREATE DATABASE IF NOT EXISTS \\\`${database}\\\`;"`.replace(
        /\\`/g,
        "`"
      );
    execSync(createCmd);
    console.log(`✅ Database '${database}' ensured.`);

    // Step 2: Restore the dump
    const sql = fs.readFileSync(fullPath);
    const restoreCmd = `docker exec -i ${container} /usr/bin/mysql -u ${username} --password=${password} ${database}`;
    execSync(restoreCmd, { input: sql });

    console.log(`\n✅ Restore completed from ${selectedFile}`);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    rl.close();
  }
}

restoreDatabase();
