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

async function backupDatabase() {
  try {
    const containers = execSync('docker ps --format "{{.Names}}"')
      .toString()
      .trim()
      .split("\n");

    console.log("\nAvailable Docker Containers:");
    containers.forEach((name, i) => console.log(`${i + 1}. ${name}`));

    const containerIndex = await ask("\nSelect container number: ");
    const container = containers[parseInt(containerIndex) - 1];

    const database = await ask("Enter database name: ");
    const username = (await ask("Enter DB username (default: root): ")) || "root";
    const password = (await ask("Enter DB password (default: anin): ")) || "anin";

    const cmd = `docker exec ${container} /usr/bin/mysqldump -u ${username} --password=${password} ${database}`;
    const backup = execSync(cmd);
    fs.writeFileSync("backup.sql", backup);

    console.log("\n✅ Backup completed: backup.sql");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
  } finally {
    rl.close();
  }
}

backupDatabase();