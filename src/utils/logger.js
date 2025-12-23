const chalk = require("chalk");
const gradient = require("gradient-string").default || require("gradient-string");
const ora = require("ora").default || require("ora");
const stripAnsi = require("strip-ansi").default || require("strip-ansi");

const Colors = {
    blue: chalk.hex("#4dabf7"),
    cyan: chalk.hex("#00c9a7"),
    green: chalk.hex("#51cf66"),
    yellow: chalk.hex("#ffd43b"),
    red: chalk.hex("#ff6b6b"),
    dim: chalk.dim,
    bold: chalk.bold,
};

const fmtTime = () =>
    new Date().toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour12: false,
    });

function clearScreen() {
    process.stdout.write(process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[0f");
}

function printBanner(feedCount) {
    const title = gradient(["#00c9ff", "#92fe9d"])("🚀 TELEGRAM RSS BOT PRO");
    const info = `${chalk.gray("Feeds:")} ${chalk.cyan(feedCount)} | ${chalk.gray("Timezone: WIB")}`;
    const started = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });

    console.log("");
    console.log(chalk.cyan("╔" + "═".repeat(62) + "╗"));
    console.log(`║  ${title.padEnd(60)}║`);
    console.log(chalk.cyan("╠" + "═".repeat(62) + "╣"));
    console.log(`║  ${info.padEnd(60)}║`);
    console.log(`║  ${chalk.gray(`Started: ${started}`).padEnd(60)}║`);
    console.log(chalk.cyan("╚" + "═".repeat(62) + "╝"));
    console.log("");
}

async function showStartupAnimation() {
    clearScreen();
    const spinner = ora({
        text: chalk.cyan("Menghubungkan ke sumber berita..."),
        spinner: "dots",
    }).start();

    await new Promise((r) => setTimeout(r, 2500));
    spinner.text = chalk.green("Terhubung ke semua RSS feeds!");
    spinner.succeed();
    await new Promise((r) => setTimeout(r, 600));
}

function printStatusBar(active, total, totalSent) {
    const now = fmtTime();
    const percent = Math.min(1, active / total);
    const width = 25;
    const filled = Math.round(width * percent);
    const bar = chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(width - filled));

    const line =
        `${chalk.blue(`[${now}]`)} ${bar}  ` +
        `${chalk.cyan(`Feeds:`)} ${active}/${total} | ` +
        `${chalk.green(`Sent:`)} ${totalSent}`;

    const clean = stripAnsi(line).length;
    process.stdout.write("\r" + line + " ".repeat(Math.max(0, 110 - clean)));
}

function logSuccess(source, title) {
    const t = fmtTime();
    const short = title.length > 70 ? title.slice(0, 70) + "…" : title;
    console.log(
        `\n${chalk.green("✔")} ${chalk.gray(`[${t}]`)} ${chalk.bold(source)}\n  ${chalk.dim("└─")} ${chalk.white(short)}`
    );
}

function logWarning(msg) {
    console.log(`\n${chalk.yellow("⚠")} ${chalk.yellowBright(msg)}`);
}

function logError(msg, err) {
    console.log(`\n${chalk.red("✗ 💥 FATAL ERROR")}`);
    console.log(chalk.redBright(msg));
    if (err) console.log(chalk.dim(String(err)));
}


module.exports = {
    Colors,
    clearScreen,
    printBanner,
    printStatusBar,
    showStartupAnimation,
    logSuccess,
    logWarning,
    logError,
};
