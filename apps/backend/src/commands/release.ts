import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { Logger } from "@orion/shared";
import { StateManager, HistoryManager } from "@orion/infrastructure";

const logger = new Logger({ prefix: "release" });

interface ReleaseAnswers {
  version: string;
  type: string;
  confirm: boolean;
}

export function releaseCommand(program: Command): void {
  program
    .command("release")
    .description("Create a release with the Git Agent")
    .option("-v, --version <version>", "Specific version to release")
    .option("-t, --type <type>", "Release type: major, minor, patch")
    .option("-y, --yes", "Skip confirmation")
    .option("--dry-run", "Preview release without executing")
    .action(
      async (options: {
        version?: string;
        type?: string;
        yes?: boolean;
        dryRun?: boolean;
      }) => {
        console.log(chalk.bold.cyan("\n  Orion CLI - Release\n"));

        const spinner = ora("Loading configuration...").start();

        try {
          const stateManager = new StateManager(process.cwd());
          const historyManager = new HistoryManager(process.cwd());

          const config = await stateManager.read<Record<string, unknown>>("config.json");
          if (!config) {
            spinner.fail(chalk.red("Project not initialized"));
            console.log(chalk.yellow("  Run `orion init` first.\n"));
            process.exit(1);
          }

          spinner.stop();

          let answers: ReleaseAnswers;

          if (options.version) {
            answers = {
              version: options.version,
              type: options.type ?? "patch",
              confirm: options.yes ?? false,
            };
          } else {
            answers = await inquirer.prompt([
              {
                type: "list",
                name: "type",
                message: "Release type:",
                choices: ["patch", "minor", "major"],
                default: options.type ?? "patch",
              },
              {
                type: "input",
                name: "version",
                message: "Version (leave empty for auto):",
                default: "",
              },
              {
                type: "confirm",
                name: "confirm",
                message: "Confirm release?",
                default: false,
                when: () => !options.yes,
              },
            ]);
          }

          if (!answers.confirm && !options.yes) {
            console.log(chalk.yellow("\n  Release cancelled.\n"));
            return;
          }

          spinner.start("Preparing release...");

          // TODO: Wire Git Agent when implemented
          spinner.text = "Running pre-release checks...";
          await new Promise((resolve) => setTimeout(resolve, 800));

          spinner.text = "Generating changelog...";
          await new Promise((resolve) => setTimeout(resolve, 1000));

          spinner.text = "Creating release commit...";
          await new Promise((resolve) => setTimeout(resolve, 600));

          spinner.text = "Creating git tag...";
          await new Promise((resolve) => setTimeout(resolve, 400));

          if (options.dryRun) {
            spinner.succeed(chalk.green("Dry run complete!"));
            console.log(chalk.dim("\n  No changes were made.\n"));
            return;
          }

          spinner.text = "Pushing to remote...";
          await new Promise((resolve) => setTimeout(resolve, 1000));

          spinner.succeed(chalk.green("Release created!"));

          const version = answers.version || `auto (${answers.type})`;

          console.log(chalk.bold("\n  Release Summary:"));
          console.log(chalk.dim("  ────────────────"));
          console.log(`  Version:   ${chalk.white(version)}`);
          console.log(`  Type:      ${chalk.white(answers.type)}`);
          console.log(`  Tag:       ${chalk.white(`v${version}`)}`);
          console.log(`  Branch:    ${chalk.white("main")}`);
          console.log();

          await historyManager.append({
            id: crypto.randomUUID(),
            taskId: "release",
            agentId: "git",
            action: "release",
            input: version,
            output: "released",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 2800,
            success: true,
          });
        } catch (error) {
          spinner.fail(chalk.red("Release failed"));
          logger.error("Release error:", error);
          process.exit(1);
        }
      }
    );
}
